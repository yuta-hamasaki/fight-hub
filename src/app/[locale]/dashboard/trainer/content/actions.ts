"use server";

import { revalidatePath } from "next/cache";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function selectedPlanIds(formData: FormData) {
  return formData
    .getAll("planIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function isValidHttpUrl(value: string) {
  if (!value) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function savePremiumContent(locale: Locale, formData: FormData): Promise<void> {
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    return;
  }

  const contentId = stringValue(formData, "contentId");
  const titleEn = stringValue(formData, "titleEn");
  const titleJa = stringValue(formData, "titleJa");
  const summaryEn = stringValue(formData, "summaryEn");
  const summaryJa = stringValue(formData, "summaryJa");
  const bodyEn = stringValue(formData, "bodyEn");
  const bodyJa = stringValue(formData, "bodyJa");
  const thumbnailUrl = stringValue(formData, "thumbnailUrl");
  const youtubeUrl = stringValue(formData, "youtubeUrl");
  const typeInput = stringValue(formData, "contentType");
  const contentType = typeInput === "YOUTUBE" ? "YOUTUBE" : "TEXT";
  const planIds = selectedPlanIds(formData);

  if (!titleEn || !bodyEn) {
    return;
  }

  if (!isValidHttpUrl(thumbnailUrl) || !isValidHttpUrl(youtubeUrl)) {
    return;
  }

  const trainerPlans = (await prisma.subscriptionPlan.findMany({
    where: {
      trainerProfile: { userId: user.id },
      isActive: true,
    },
    select: { id: true },
  })) as Array<{ id: string }>;
  const allowedPlanIds = new Set(trainerPlans.map((plan) => plan.id));
  const filteredPlanIds = planIds.filter((planId) => allowedPlanIds.has(planId));

  if (contentId) {
    const existing = (await prisma.contentPost.findFirst({
      where: { id: contentId, authorId: user.id, isPremium: true },
      select: { id: true },
    })) as { id: string } | null;

    if (!existing) {
      return;
    }

    await prisma.$transaction(async (tx: { [key: string]: { [key: string]: (...args: unknown[]) => Promise<unknown> } }) => {
      await tx.contentPost.update({
        where: { id: contentId },
        data: {
          contentType,
          titleEn,
          titleJa: titleJa || null,
          summaryEn: summaryEn || null,
          summaryJa: summaryJa || null,
          bodyEn,
          bodyJa: bodyJa || null,
          thumbnailUrl: thumbnailUrl || null,
          youtubeUrl: youtubeUrl || null,
        },
      });

      await tx.contentAccess.deleteMany({ where: { contentPostId: contentId } });
      if (filteredPlanIds.length > 0) {
        await tx.contentAccess.createMany({
          data: filteredPlanIds.map((subscriptionPlanId) => ({ contentPostId: contentId, subscriptionPlanId })),
          skipDuplicates: true,
        });
      }
    });
  } else {
    const created = (await prisma.contentPost.create({
      data: {
        authorId: user.id,
        isPremium: true,
        contentType,
        titleEn,
        titleJa: titleJa || null,
        summaryEn: summaryEn || null,
        summaryJa: summaryJa || null,
        bodyEn,
        bodyJa: bodyJa || null,
        thumbnailUrl: thumbnailUrl || null,
        youtubeUrl: youtubeUrl || null,
      },
      select: { id: true },
    })) as { id: string };

    if (filteredPlanIds.length > 0) {
      await prisma.contentAccess.createMany({
        data: filteredPlanIds.map((subscriptionPlanId) => ({ contentPostId: created.id, subscriptionPlanId })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath(`/${locale}/dashboard/trainer/content`);
  revalidatePath(`/${locale}/dashboard/client/content`);
}

export async function setPremiumContentPublishStatus(locale: Locale, formData: FormData): Promise<void> {
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    return;
  }

  const contentId = stringValue(formData, "contentId");
  const next = stringValue(formData, "next");
  if (!contentId || (next !== "PUBLISHED" && next !== "DRAFT")) {
    return;
  }

  const existing = (await prisma.contentPost.findFirst({
    where: { id: contentId, authorId: user.id, isPremium: true },
    select: { id: true },
  })) as { id: string } | null;

  if (!existing) return;

  await prisma.contentPost.update({
    where: { id: contentId },
    data: {
      status: next,
      publishedAt: next === "PUBLISHED" ? new Date() : null,
    },
  });

  revalidatePath(`/${locale}/dashboard/trainer/content`);
  revalidatePath(`/${locale}/dashboard/client/content`);
}
