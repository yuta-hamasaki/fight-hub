"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import type { ReviewActionState } from "@/components/trainers/review-manager";

import { reserveBooking } from "@/lib/marketplace/bookings";

function t(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function manageReview(
  locale: Locale,
  trainerProfileId: string,
  _state: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireDbUser(locale);
  if (user.role !== "CLIENT") {
    return {
      status: "error",
      message:
        locale === "ja"
          ? "クライアントのみレビューを投稿できます。"
          : "Only clients can review trainers.",
    };
  }

  const trainer = await prisma.trainerProfile.findFirst({
    where: { id: trainerProfileId, isPublished: true },
    select: { userId: true },
  });
  if (!trainer)
    return {
      status: "error",
      message:
        locale === "ja" ? "トレーナーが見つかりません。" : "Trainer not found.",
    };

  if (t(formData.get("intent")) === "delete") {
    await prisma.review.deleteMany({
      where: { trainerProfileId, reviewerId: user.id },
    });
    revalidatePath(`/${locale}/trainers/${trainerProfileId}`);
    revalidatePath(`/${locale}/trainers`);
    return {
      status: "success",
      message: locale === "ja" ? "レビューを削除しました。" : "Review deleted.",
    };
  }

  const attended = await prisma.booking.findFirst({
    where: {
      clientId: user.id,
      trainerId: trainer.userId,
      status: "COMPLETED",
    },
  });
  if (!attended)
    return {
      status: "error",
      message:
        locale === "ja"
          ? "受講完了後にレビューを投稿できます。"
          : "Complete a session before posting a review.",
    };
  const rating = Number(t(formData.get("rating")));
  const title = t(formData.get("title"));
  const comment = t(formData.get("comment"));
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    title.length > 100 ||
    !comment ||
    comment.length > 1000
  ) {
    return {
      status: "error",
      message:
        locale === "ja"
          ? "評価とコメントを確認してください。"
          : "Check the rating and comment.",
    };
  }

  const localized =
    locale === "ja"
      ? {
          titleJa: title || null,
          commentJa: comment,
          titleEn: null,
          commentEn: null,
        }
      : {
          titleEn: title || null,
          commentEn: comment,
          titleJa: null,
          commentJa: null,
        };
  await prisma.review.upsert({
    where: {
      trainerProfileId_reviewerId: { trainerProfileId, reviewerId: user.id },
    },
    create: {
      trainerProfileId,
      reviewerId: user.id,
      targetUserId: trainer.userId,
      rating,
      ...localized,
    },
    update: { rating, ...localized },
  });
  revalidatePath(`/${locale}/trainers/${trainerProfileId}`);
  revalidatePath(`/${locale}/trainers`);
  return {
    status: "success",
    message: locale === "ja" ? "レビューを保存しました。" : "Review saved.",
  };
}

export async function createBooking(
  locale: Locale,
  trainerProfileId: string,
  formData: FormData,
) {
  const user = await requireDbUser(locale);
  if (user.role !== "CLIENT") return;
  const offeringId = t(formData.get("sessionOfferingId"));
  const offering = await prisma.sessionOffering.findFirst({
    where: { id: offeringId, trainerProfileId },
  });
  if (!offering) return;
  let result;
  try {
    result = await reserveBooking({
      userId: user.id,
      offeringId,
      startsAt: new Date(t(formData.get("startsAtUtc"))),
      timezone: t(formData.get("timezone")),
      passId: t(formData.get("passId")) || undefined,
      count: Number(formData.get("count") || 1),
      locale,
    });
  } catch {
    redirect(`/${locale}/trainers/${trainerProfileId}?booking=unavailable`);
  }
  redirect(result.url || `/${locale}/dashboard/bookings/${result.bookingId}`);
}
