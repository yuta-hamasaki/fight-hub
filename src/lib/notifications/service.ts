// import { Prisma } from "@prisma/client";

import type { Locale } from "@/lib/constants/locales";
// import { sendLineText } from "@/lib/line/messaging";
import { prisma } from "@/lib/prisma";
import { notificationMessages, type BookingMessageData } from "./messages";

type NotificationType =
  | "BOOKING_CONFIRMED"
  | "TRAINER_NEW_BOOKING"
  | "BOOKING_REMINDER_24H"
  | "REVIEW_REQUEST";

function localeOf(value: string | null | undefined): Locale {
  return value === "ja" ? "ja" : "en";
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

async function deliver(
  userId: string,
  bookingId: string,
  type: NotificationType,
  text: string,
) {
  await prisma.appNotification.upsert({
    where: { dedupeKey: `${type}:${bookingId}:${userId}` },
    create: {
      userId,
      titleJa: text,
      titleEn: text,
      path: `/dashboard/bookings/${bookingId}`,
      dedupeKey: `${type}:${bookingId}:${userId}`,
    },
    update: {},
  });
  // LINE deferred until a future release.
  //   const connection = await prisma.lineConnection.findUnique({
  //     where: { userId },
  //   });
  //   if (!connection?.notificationEnabled || !connection.friendStatus)
  //     return "skipped" as const;
  //
  //   let log: { id: string };
  //   try {
  //     log = await prisma.notificationLog.create({
  //       data: { userId, bookingId, type, channel: "LINE" },
  //       select: { id: true },
  //     });
  //   } catch (error) {
  //     if (
  //       error instanceof Prisma.PrismaClientKnownRequestError &&
  //       error.code === "P2002"
  //     )
  //       return "duplicate" as const;
  //     throw error;
  //   }
  //   try {
  //     await sendLineText(connection.lineUserId, text);
  //     return "sent" as const;
  //   } catch (error) {
  //     await prisma.notificationLog
  //       .delete({ where: { id: log.id } })
  //       .catch(() => undefined);
  //     console.error("LINE notification delivery failed", {
  //       userId,
  //       bookingId,
  //       type,
  //       error: error instanceof Error ? error.message : "unknown",
  //     });
  //     return "failed" as const;
  //   }
}

async function bookingData(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { include: { profile: true } },
      trainer: { include: { profile: true, trainerProfile: true } },
      sessionOffering: true,
    },
  });
}

function details(
  booking: NonNullable<Awaited<ReturnType<typeof bookingData>>>,
  locale: Locale,
): BookingMessageData {
  return {
    startsAt: booking.startsAt,
    timezone: booking.client.profile?.timezone || booking.timezone,
    offeringTitle:
      (locale === "ja"
        ? booking.sessionOffering.titleJa
        : booking.sessionOffering.titleEn) || booking.sessionOffering.titleEn,
    durationMinutes: booking.sessionOffering.durationMinutes,
    trainerName: booking.trainer.profile?.displayName ?? undefined,
    amount: Number(booking.amountPaid ?? booking.sessionOffering.price),
    currency: booking.currency,
    url: `${appUrl()}/${locale}/dashboard/bookings/${booking.id}`,
  };
}

export const notificationService = {
  async bookingConfirmed(bookingId: string) {
    const booking = await bookingData(bookingId);
    if (!booking || booking.status !== "CONFIRMED") return;
    const locale = localeOf(booking.client.profile?.locale);
    await deliver(
      booking.clientId,
      booking.id,
      "BOOKING_CONFIRMED",
      notificationMessages.bookingConfirmed(locale, details(booking, locale)),
    );
  },
  async newTrainerBooking(bookingId: string) {
    const booking = await bookingData(bookingId);
    if (!booking || booking.status !== "CONFIRMED") return;
    const locale = localeOf(booking.trainer.profile?.locale);
    const data = {
      ...details(booking, locale),
      timezone: booking.trainer.profile?.timezone || "Asia/Tokyo",
      url: `${appUrl()}/${locale}/dashboard/bookings/${booking.id}`,
    };
    await deliver(
      booking.trainerId,
      booking.id,
      "TRAINER_NEW_BOOKING",
      notificationMessages.trainerNewBooking(locale, data),
    );
  },
  async bookingReminder(bookingId: string) {
    const booking = await bookingData(bookingId);
    if (!booking || booking.status !== "CONFIRMED") return;
    const locale = localeOf(booking.client.profile?.locale);
    await deliver(
      booking.clientId,
      booking.id,
      "BOOKING_REMINDER_24H",
      notificationMessages.bookingReminder(locale, details(booking, locale)),
    );
  },
  async reviewRequest(bookingId: string) {
    const booking = await bookingData(bookingId);
    if (!booking || booking.status !== "COMPLETED") return;
    const locale = localeOf(booking.client.profile?.locale);
    const name =
      booking.trainer.profile?.displayName ??
      (locale === "ja" ? "トレーナー" : "your trainer");
    await deliver(
      booking.clientId,
      booking.id,
      "REVIEW_REQUEST",
      notificationMessages.reviewRequest(
        locale,
        name,
        `${appUrl()}/${locale}/trainers/${booking.trainer.trainerProfile?.id}`,
      ),
    );
  },
};

export async function sendUpcomingBookingReminders(now = new Date()) {
  const startsAfter = new Date(now.getTime() + 23.75 * 60 * 60 * 1000);
  const startsBefore = new Date(now.getTime() + 24.25 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { gte: startsAfter, lte: startsBefore },
    },
    select: { id: true },
  });
  await Promise.allSettled(
    bookings.map(({ id }) => notificationService.bookingReminder(id)),
  );
  return bookings.length;
}
