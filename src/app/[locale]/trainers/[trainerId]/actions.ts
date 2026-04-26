"use server";

import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

function t(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createBooking(locale: Locale, trainerProfileId: string, formData: FormData) {
  const user = await requireDbUser(locale);
  if (user.role !== "CLIENT") {
    return;
  }

  const sessionOfferingId = t(formData.get("sessionOfferingId"));
  const startsAtUtc = t(formData.get("startsAtUtc"));
  const timezone = t(formData.get("timezone"));

  const startsAt = new Date(startsAtUtc);
  if (!sessionOfferingId || Number.isNaN(startsAt.valueOf())) {
    return;
  }

  const offering = await prisma.sessionOffering.findFirst({
    where: { id: sessionOfferingId, trainerProfileId, isActive: true },
    select: { id: true, trainerUserId: true, durationMinutes: true },
  });

  if (!offering) {
    return;
  }

  const endsAt = new Date(startsAt.getTime() + offering.durationMinutes * 60 * 1000);

  await prisma.booking.create({
    data: {
      sessionOfferingId: offering.id,
      clientId: user.id,
      trainerId: offering.trainerUserId,
      startsAt,
      endsAt,
      notes: timezone ? `timezone:${timezone}` : null,
      status: "PENDING",
    },
  });

  revalidatePath(`/${locale}/trainers/${trainerProfileId}`);
  revalidatePath(`/${locale}/dashboard/client`);
}
