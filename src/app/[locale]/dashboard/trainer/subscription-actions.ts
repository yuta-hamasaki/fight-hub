"use server";

import { revalidatePath } from "next/cache";

import type { Locale } from "@/lib/constants/locales";
import { requireDbUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import type { SubscriptionPlanFormState } from "./subscription-plan-types";

function parsePrice(value: string) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 50 || numeric > 1000000) {
    return null;
  }

  return Math.round(numeric * 100) / 100;
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function saveSubscriptionPlan(
  locale: Locale,
  _prevState: SubscriptionPlanFormState,
  formData: FormData,
): Promise<SubscriptionPlanFormState> {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") {
    return { status: "error", message: "Only trainers can manage plans." };
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!trainerProfile) {
    return { status: "error", message: "Please create your trainer profile first." };
  }

  const planId = normalizeText(formData.get("planId"));
  const nameEn = normalizeText(formData.get("nameEn"));
  const nameJa = normalizeText(formData.get("nameJa"));
  const descriptionEn = normalizeText(formData.get("descriptionEn"));
  const descriptionJa = normalizeText(formData.get("descriptionJa"));
  const priceMonthly = parsePrice(normalizeText(formData.get("priceMonthly")));
  const isActive = normalizeText(formData.get("isActive")) === "on";
  const sessionOfferingId = normalizeText(formData.get("sessionOfferingId"));
  const sessionsPerMonth = Number(formData.get("sessionsPerMonth"));
  const offering = await prisma.sessionOffering.findFirst({
    where: { id: sessionOfferingId, trainerUserId: user.id, trainerProfileId: trainerProfile.id, isActive: true, isTrial: false },
    select: { id: true },
  });
  if (!offering || !Number.isInteger(sessionsPerMonth) || sessionsPerMonth < 1 || sessionsPerMonth > 50) {
    return { status: "error", message: locale === "ja" ? "対象レッスンと月1〜50回の利用回数を設定してください。" : "Choose a regular lesson and 1–50 sessions per month." };
  }

  if (!nameEn || nameEn.length > 80) {
    return { status: "error", message: "Plan name (EN) is required and must be 80 characters or fewer." };
  }

  if (nameJa.length > 80) {
    return { status: "error", message: "Plan name (JA) must be 80 characters or fewer." };
  }

  if (!priceMonthly) {
    return { status: "error", message: locale === "ja" ? "月額料金は50〜1,000,000円の整数にしてください。" : "Set a whole-yen monthly price between 50 and 1,000,000." };
  }

  if (descriptionEn.length > 500 || descriptionJa.length > 500) {
    return { status: "error", message: "Description must be 500 characters or fewer." };
  }

  const data = {
    sessionOfferingId,
    sessionsPerMonth,
    trainerProfileId: trainerProfile.id,
    nameEn,
    nameJa: nameJa || null,
    descriptionEn: descriptionEn || null,
    descriptionJa: descriptionJa || null,
    priceMonthly,
    currency: "JPY",
    isActive,
  };

  if (planId) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, trainerProfileId: trainerProfile.id },
      select: { id: true },
    });

    if (!existing) {
      return { status: "error", message: "Plan not found." };
    }

    await prisma.subscriptionPlan.update({
      where: { id: planId },
      data,
    });
  } else {
    await prisma.subscriptionPlan.create({ data });
  }

  revalidatePath(`/${locale}/dashboard/trainer`);
  revalidatePath(`/${locale}/trainers`);

  return { status: "success", message: "Plan saved." };
}

export async function setPlanPublishStatus(locale: Locale, planId: string, isActive: boolean) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") {
    return;
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!trainerProfile) {
    return;
  }

  await prisma.subscriptionPlan.updateMany({
    where: {
      id: planId,
      trainerProfileId: trainerProfile.id,
      ...(isActive ? { sessionOfferingId: { not: null }, sessionsPerMonth: { gte: 1, lte: 50 }, sessionOffering: { trainerUserId: user.id, isActive: true, isTrial: false } } : {}),
    },
    data: {
      isActive,
    },
  });

  revalidatePath(`/${locale}/dashboard/trainer`);
  revalidatePath(`/${locale}/trainers`);
}
