"use server";

import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { getPrismaClient } from "@/lib/prisma";

function t(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function encodeDescription(description: string, format: string) {
  return `[[format:${format}]]\n${description}`.trim();
}

function decodeDescription(value: string | null) {
  const input = value ?? "";
  const match = input.match(/^\[\[format:(online|in_person|hybrid)\]\]\n?/i);
  if (!match) {
    return { format: "online", description: input };
  }

  return {
    format: match[1].toLowerCase(),
    description: input.replace(/^\[\[format:(online|in_person|hybrid)\]\]\n?/i, ""),
  };
}

export { decodeDescription };

export async function saveSessionOffering(locale: Locale, formData: FormData) {
  const user = await requireDbUser(locale);
  const prisma = getPrismaClient();

  if (user.role !== "TRAINER") {
    return;
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!trainerProfile) {
    return;
  }

  const offeringId = t(formData.get("offeringId"));
  const titleEn = t(formData.get("titleEn"));
  const titleJa = t(formData.get("titleJa"));
  const descriptionEn = t(formData.get("descriptionEn"));
  const descriptionJa = t(formData.get("descriptionJa"));
  const format = t(formData.get("format")) || "online";
  const durationMinutes = Number.parseInt(t(formData.get("durationMinutes")), 10);
  const price = Number.parseFloat(t(formData.get("price")));
  const isActive = t(formData.get("isActive")) === "on";

  if (!titleEn || !Number.isFinite(durationMinutes) || durationMinutes < 15 || !Number.isFinite(price) || price <= 0) {
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
  const prisma = getPrismaClient();

  if (user.role !== "TRAINER") {
    return;
  }

  const bookingId = t(formData.get("bookingId"));
  const status = t(formData.get("status"));
  if (!bookingId || !["PENDING", "CONFIRMED", "COMPLETED", "CANCELED"].includes(status)) {
    return;
  }

  await prisma.booking.updateMany({
    where: { id: bookingId, trainerId: user.id },
    data: { status: status as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED" },
  });

  revalidatePath(`/${locale}/dashboard/trainer`);
  revalidatePath(`/${locale}/dashboard/client`);
}
