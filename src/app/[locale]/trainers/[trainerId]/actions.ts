"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import { calculatePlatformFeeAmount } from "@/lib/billing/fees";
import { getAppBaseUrl, getStripeClient } from "@/lib/stripe";
import { isStripeOnboardingComplete } from "@/lib/stripe/connect";
import { isWithinAvailability } from "@/lib/bookings/availability";
import type { ReviewActionState } from "@/components/trainers/review-manager";

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
    return { status: "error", message: locale === "ja" ? "クライアントのみレビューを投稿できます。" : "Only clients can review trainers." };
  }

  const trainer = await prisma.trainerProfile.findFirst({
    where: { id: trainerProfileId, isPublished: true },
    select: { userId: true },
  });
  if (!trainer) return { status: "error", message: locale === "ja" ? "トレーナーが見つかりません。" : "Trainer not found." };

  if (t(formData.get("intent")) === "delete") {
    await prisma.review.deleteMany({ where: { trainerProfileId, reviewerId: user.id } });
    revalidatePath(`/${locale}/trainers/${trainerProfileId}`);
    revalidatePath(`/${locale}/trainers`);
    return { status: "success", message: locale === "ja" ? "レビューを削除しました。" : "Review deleted." };
  }

  const rating = Number(t(formData.get("rating")));
  const title = t(formData.get("title"));
  const comment = t(formData.get("comment"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || title.length > 100 || !comment || comment.length > 1000) {
    return { status: "error", message: locale === "ja" ? "評価とコメントを確認してください。" : "Check the rating and comment." };
  }

  const localized = locale === "ja"
    ? { titleJa: title || null, commentJa: comment, titleEn: null, commentEn: null }
    : { titleEn: title || null, commentEn: comment, titleJa: null, commentJa: null };
  await prisma.review.upsert({
    where: { trainerProfileId_reviewerId: { trainerProfileId, reviewerId: user.id } },
    create: { trainerProfileId, reviewerId: user.id, targetUserId: trainer.userId, rating, ...localized },
    update: { rating, ...localized },
  });
  revalidatePath(`/${locale}/trainers/${trainerProfileId}`);
  revalidatePath(`/${locale}/trainers`);
  return { status: "success", message: locale === "ja" ? "レビューを保存しました。" : "Review saved." };
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
    include: { trainer: { include: { stripeAccount: true } } },
  });

  if (!offering) {
    return;
  }

  const endsAt = new Date(startsAt.getTime() + offering.durationMinutes * 60 * 1000);

  if (startsAt <= new Date()) {
    redirect(`/${locale}/trainers/${trainerProfileId}?booking=invalid-time`);
  }

  const [availability, conflict] = await Promise.all([
    prisma.trainerAvailability.findMany({
      where: { trainerId: offering.trainerUserId, dayOfWeek: startsAt.getUTCDay(), isActive: true },
    }),
    prisma.booking.findFirst({
      where: {
        trainerId: offering.trainerUserId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
  ]);
  if (conflict || !isWithinAvailability({ startsAt, endsAt }, availability)) {
    redirect(`/${locale}/trainers/${trainerProfileId}?booking=unavailable`);
  }

  const stripeAccount = offering.trainer.stripeAccount;
  if (!stripeAccount || !isStripeOnboardingComplete(stripeAccount)) {
    redirect(`/${locale}/trainers/${trainerProfileId}?booking=payment-unavailable`);
  }

  const booking = await prisma.booking.create({
    data: {
      sessionOfferingId: offering.id,
      clientId: user.id,
      trainerId: offering.trainerUserId,
      startsAt,
      endsAt,
      notes: timezone ? `timezone:${timezone}` : null,
      status: "PENDING",
      amountPaid: offering.price,
      currency: offering.currency,
    },
  });

  const amount = Math.round(Number(offering.price) * 100);
  const session = await getStripeClient().checkout.sessions.create({
    mode: "payment",
    success_url: `${getAppBaseUrl()}/${locale}/dashboard/client?booking=success`,
    cancel_url: `${getAppBaseUrl()}/${locale}/trainers/${trainerProfileId}?booking=canceled`,
    metadata: { bookingId: booking.id },
    payment_intent_data: {
      application_fee_amount: calculatePlatformFeeAmount(amount),
      transfer_data: { destination: stripeAccount.stripeAccountId },
      metadata: { bookingId: booking.id },
    },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: offering.currency.toLowerCase(),
        unit_amount: amount,
        product_data: { name: offering.titleEn, description: offering.descriptionEn ?? undefined },
      },
    }],
  });

  await prisma.booking.update({ where: { id: booking.id }, data: { stripeCheckoutSessionId: session.id } });

  revalidatePath(`/${locale}/trainers/${trainerProfileId}`);
  revalidatePath(`/${locale}/dashboard/client`);
  if (!session.url) {
    redirect(`/${locale}/trainers/${trainerProfileId}?booking=payment-error`);
  }
  redirect(session.url);
}
