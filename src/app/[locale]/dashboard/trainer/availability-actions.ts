"use server";

import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

function timeToMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : -1;
}

export async function saveAvailability(locale: Locale, formData: FormData) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") return;
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startMinute = timeToMinute(String(formData.get("startTime") ?? ""));
  const endMinute = timeToMinute(String(formData.get("endTime") ?? ""));
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || startMinute < 0 || endMinute <= startMinute) return;
  await prisma.trainerAvailability.create({ data: { trainerId: user.id, dayOfWeek, startMinute, endMinute, timezone: "UTC" } });
  revalidatePath(`/${locale}/dashboard/trainer`);
}

export async function deleteAvailability(locale: Locale, formData: FormData) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") return;
  await prisma.trainerAvailability.deleteMany({ where: { id: String(formData.get("availabilityId") ?? ""), trainerId: user.id } });
  revalidatePath(`/${locale}/dashboard/trainer`);
}
