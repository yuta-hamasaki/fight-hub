import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localParts, dayMs } from "./rules";
type DB = Prisma.TransactionClient;
export async function trainerLock(db: DB, trainerId: string) {
  await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`trainer:${trainerId}`}))`;
}
export async function userLock(db: DB, userId: string) {
  await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`client:${userId}`}))`;
}
export async function scheduleData(
  db: DB,
  trainerId: string,
  from: Date,
  to: Date,
  exclude?: string,
) {
  const [profile, windows, exceptions, bookings] = await Promise.all([
    db.trainerProfile.findUniqueOrThrow({ where: { userId: trainerId } }),
    db.trainerAvailability.findMany({ where: { trainerId, isActive: true } }),
    db.availabilityException.findMany({
      where: { trainerId, startsAt: { lt: to }, endsAt: { gt: from } },
    }),
    db.booking.findMany({
      where: {
        trainerId,
        id: exclude ? { not: exclude } : undefined,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: new Date(to.getTime() + dayMs) },
        endsAt: { gt: new Date(from.getTime() - dayMs) },
      },
    }),
  ]);
  return { profile, windows, exceptions, bookings };
}
export function slotAvailable(
  data: Awaited<ReturnType<typeof scheduleData>>,
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
) {
  if (
    !Number.isFinite(startsAt.getTime()) ||
    endsAt <= startsAt ||
    startsAt.getTime() <
      now.getTime() + data.profile.bookingLeadHours * 3600000 ||
    startsAt.getTime() > now.getTime() + 180 * dayMs
  )
    return false;
  const closed = data.exceptions.some(
    (x) => !x.available && x.startsAt < endsAt && x.endsAt > startsAt,
  );
  if (closed) return false;
  const extra = data.exceptions.some(
    (x) => x.available && x.startsAt <= startsAt && x.endsAt >= endsAt,
  );
  const weekly = data.windows.some((w) => {
    const start = localParts(startsAt, w.timezone),
      end = localParts(new Date(endsAt.getTime() - 1), w.timezone);
    return (
      start.day === end.day &&
      start.weekday === w.dayOfWeek &&
      start.minute >= w.startMinute &&
      end.minute < w.endMinute
    );
  });
  if (!extra && !weekly) return false;
  const buffer = data.profile.bufferMinutes * 60000;
  return !data.bookings.some(
    (b) =>
      b.startsAt.getTime() < endsAt.getTime() + buffer &&
      b.endsAt.getTime() + buffer > startsAt.getTime(),
  );
}
export async function availableSlots(
  offeringId: string,
  day: string,
  timezone: string,
  authorizedBookingId?: string,
) {
  const offering = await prisma.sessionOffering.findFirst({
    where: {
      id: offeringId,
      ...(authorizedBookingId
        ? { bookings: { some: { id: authorizedBookingId } } }
        : { isActive: true, trainerProfile: { isPublished: true } }),
    },
  });
  if (!offering) return [];
  const noon = new Date(`${day}T12:00:00Z`);
  if (
    !Number.isFinite(noon.getTime()) ||
    Math.abs(noon.getTime() - Date.now()) > 182 * dayMs
  )
    return [];
  const from = new Date(noon.getTime() - 36 * 3600000),
    to = new Date(noon.getTime() + 36 * 3600000);
  const data = await scheduleData(
    prisma,
    offering.trainerUserId,
    from,
    to,
    authorizedBookingId,
  );
  const slots: string[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += 15 * 60000) {
    const start = new Date(t);
    if (localParts(start, timezone).day !== day) continue;
    if (
      slotAvailable(data, start, new Date(t + offering.durationMinutes * 60000))
    )
      slots.push(start.toISOString());
  }
  return slots;
}
