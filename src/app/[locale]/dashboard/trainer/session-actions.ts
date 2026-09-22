"use server";

import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import { cancelReservation } from "@/lib/marketplace/bookings";
import { canFinishBooking } from "@/lib/marketplace/rules";
import { notificationService } from "@/lib/notifications/service";

function t(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function encodeDescription(description: string, format: string) {
  return `[[format:${format}]]\n${description}`.trim();
}

// function decodeDescription(value: string | null) {
//   const input = value ?? "";
//   const match = input.match(/^\[\[format:(online|in_person|hybrid)\]\]\n?/i);
//   if (!match) {
//     return { format: "online", description: input };
//   }

//   return {
//     format: match[1].toLowerCase(),
//     description: input.replace(/^\[\[format:(online|in_person|hybrid)\]\]\n?/i, ""),
//   };
// }

// export { decodeDescription };

export async function saveSessionOffering(locale: Locale, formData: FormData) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") {
    return;
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!trainerProfile) {
    return;
  }

  const offeringId = t(formData.get("offeringId"));
  const titleEn = t(formData.get("titleEn"));
  const titleJa = t(formData.get("titleJa"));
  const descriptionEn = t(formData.get("descriptionEn"));
  const descriptionJa = t(formData.get("descriptionJa"));
  const format = t(formData.get("format")) || "online";
  const durationMinutes = Number.parseInt(
    t(formData.get("durationMinutes")),
    10,
  );
  const price = Number.parseFloat(t(formData.get("price")));
  const isActive = t(formData.get("isActive")) === "on";

  if (
    !titleEn ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 15 ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return;
  }

  const data = {
    trainerProfileId: trainerProfile.id,
    trainerUserId: user.id,
    titleEn,
    titleJa: titleJa || null,
    descriptionEn: encodeDescription(descriptionEn, format),
    descriptionJa: encodeDescription(descriptionJa, format),
    durationMinutes,
    price,
    currency: "JPY",
    isActive,
  };

  if (offeringId) {
    await prisma.sessionOffering.updateMany({
      where: { id: offeringId, trainerUserId: user.id },
      data,
    });
  } else {
    await prisma.sessionOffering.create({ data });
  }

  revalidatePath(`/${locale}/dashboard/trainer`);
  revalidatePath(`/${locale}/trainers`);
}

export async function updateBookingStatus(locale: Locale, formData: FormData) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") return;
  const bookingId = t(formData.get("bookingId")),
    status = t(formData.get("status"));
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, trainerId: user.id },
  });
  if (!booking) return;
  if (status === "CANCELED")
    await cancelReservation(bookingId, user.id, t(formData.get("reason")));
  else if (
    ["COMPLETED", "NO_SHOW"].includes(status) &&
    canFinishBooking(booking.status, booking.endsAt)
  ) {
    await prisma.booking.updateMany({
      where: { id: bookingId, status: "CONFIRMED" },
      data: { status: status as "COMPLETED" | "NO_SHOW" },
    });
    if (status === "COMPLETED")
      await notificationService.reviewRequest(bookingId);
  }
  revalidatePath(`/${locale}/dashboard`, "layout");
}
