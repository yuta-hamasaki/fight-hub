import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getAppBaseUrl } from "@/lib/stripe";
import { isStripeOnboardingComplete } from "@/lib/stripe/connect";
import { calculatePlatformFeeAmount } from "@/lib/billing/fees";
import { toMinor, fromMinor } from "@/lib/billing/money";
import { trainerLock, userLock, scheduleData, slotAvailable } from "./schedule";
import { validTimezone, weeklyDates, refundable } from "./rules";
import { notifyBooking } from "./notifications";

export async function reserveBooking(input: {
  userId: string;
  offeringId: string;
  startsAt: Date;
  timezone: string;
  passId?: string;
  count?: number;
  locale: string;
}) {
  if (!validTimezone(input.timezone)) throw new Error("Invalid timezone");
  const offering = await prisma.sessionOffering.findFirst({
    where: {
      id: input.offeringId,
      isActive: true,
      trainerProfile: { isPublished: true },
    },
    include: { trainer: { include: { stripeAccount: true } } },
  });
  if (
    !offering ||
    !offering.trainer.stripeAccount ||
    !isStripeOnboardingComplete(offering.trainer.stripeAccount)
  )
    throw new Error("This session is not available");
  const count = input.passId ? (input.count ?? 1) : 1;
  const dates = weeklyDates(input.startsAt, count, input.timezone);
  const seriesId = count > 1 ? randomUUID() : null;
  const bookings = await prisma.$transaction(async (db) => {
    await trainerLock(db, offering.trainerUserId);
    await userLock(db, input.userId);
    if (
      offering.isTrial &&
      (await db.booking.findFirst({
        where: {
          clientId: input.userId,
          trainerId: offering.trainerUserId,
          isTrial: true,
          status: { not: "CANCELED" },
        },
      }))
    )
      throw new Error("Trial sessions are available once per trainer");
    const schedule = await scheduleData(
      db,
      offering.trainerUserId,
      dates[0],
      new Date(dates.at(-1)!.getTime() + 86400000),
    );
    for (const startsAt of dates) {
      const endsAt = new Date(
        startsAt.getTime() + offering.durationMinutes * 60000,
      );
      if (!slotAvailable(schedule, startsAt, endsAt))
        throw new Error("This time is no longer available");
      if (
        await db.booking.findFirst({
          where: {
            clientId: input.userId,
            status: { in: ["PENDING", "CONFIRMED"] },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        })
      )
        throw new Error("You already have a booking at this time");
    }
    if (input.passId) {
      const pass = await db.passPurchase.updateMany({
        where: {
          id: input.passId,
          userId: input.userId,
          offeringId: offering.id,
          status: "ACTIVE",
          remaining: { gte: count },
          expiresAt: { gt: dates.at(-1)! },
        },
        data: { remaining: { decrement: count } },
      });
      if (pass.count !== 1) throw new Error("Not enough valid session credits");
    }
    const result = [];
    for (const startsAt of dates)
      result.push(
        await db.booking.create({
          data: {
            clientId: input.userId,
            trainerId: offering.trainerUserId,
            sessionOfferingId: offering.id,
            startsAt,
            endsAt: new Date(
              startsAt.getTime() + offering.durationMinutes * 60000,
            ),
            timezone: input.timezone,
            status: input.passId ? "CONFIRMED" : "PENDING",
            amountPaid: input.passId ? 0 : offering.price,
            currency: offering.currency,
            location: offering.location,
            meetingUrl: offering.meetingUrl,
            preparation: offering.preparation,
            cancelBefore: new Date(
              startsAt.getTime() - schedule.profile.cancellationHours * 3600000,
            ),
            holdExpiresAt: input.passId
              ? null
              : new Date(Date.now() + 31 * 60000),
            passPurchaseId: input.passId || null,
            seriesId,
            isTrial: offering.isTrial,
          },
        }),
      );
    return result;
  });
  if (input.passId) {
    await Promise.all(
      bookings.map((b) =>
        notifyBooking(
          b.id,
          "回数券で予約が確定しました",
          "Your session credit booking is confirmed",
          `confirmed:${b.id}`,
        ),
      ),
    );
    return { bookingId: bookings[0].id, url: null };
  }
  const booking = bookings[0];
  const amount = toMinor(Number(offering.price), offering.currency);
  // Retain the hold if Stripe returns an ambiguous network failure. A retry uses the same idempotency key.
  const session = await getStripeClient().checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      expires_at: Math.floor(booking.holdExpiresAt!.getTime() / 1000),
      success_url: `${getAppBaseUrl()}/${input.locale}/dashboard/bookings/${booking.id}?saved=1`,
      cancel_url: `${getAppBaseUrl()}/${input.locale}/dashboard/bookings/${booking.id}`,
      metadata: { bookingId: booking.id },
      payment_intent_data: {
        application_fee_amount: calculatePlatformFeeAmount(amount),
        transfer_data: {
          destination: offering.trainer.stripeAccount.stripeAccountId,
        },
        metadata: { bookingId: booking.id },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: offering.currency.toLowerCase(),
            unit_amount: amount,
            product_data: { name: offering.titleEn },
          },
        },
      ],
    },
    { idempotencyKey: `booking:${booking.id}` },
  );
  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: session.id },
  });
  return { bookingId: booking.id, url: session.url };
}

export async function refundBooking(id: string) {
  const b = await prisma.booking.findUniqueOrThrow({ where: { id } });
  if (
    !b.stripePaymentIntentId ||
    b.refundStatus === "SUCCEEDED" ||
    Number(b.refundAmount) <= 0
  )
    return;
  try {
    const refund = await getStripeClient().refunds.create(
      {
        payment_intent: b.stripePaymentIntentId,
        amount: toMinor(Number(b.refundAmount), b.currency),
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: { bookingId: id },
      },
      { idempotencyKey: `booking-refund:${id}` },
    );
    const status =
      refund.status === "succeeded"
        ? "SUCCEEDED"
        : refund.status === "failed" || refund.status === "canceled"
          ? "FAILED"
          : "PENDING";
    await prisma.booking.update({
      where: { id },
      data: { stripeRefundId: refund.id, refundStatus: status },
    });
    if (status === "SUCCEEDED")
      await prisma.paymentRecord.updateMany({
        where: { paymentIntentId: b.stripePaymentIntentId },
        data: { refunded: fromMinor(refund.amount, b.currency) },
      });
  } catch {
    await prisma.booking.update({
      where: { id },
      data: { refundStatus: "FAILED" },
    });
  }
}

export async function cancelReservation(
  id: string,
  actorId: string,
  reason: string,
) {
  const original = await prisma.booking.findUniqueOrThrow({ where: { id } });
  if (actorId !== original.clientId && actorId !== original.trainerId)
    throw new Error("Not authorized");
  const b = await prisma.$transaction(async (db) => {
    await trainerLock(db, original.trainerId);
    const current = await db.booking.findUniqueOrThrow({ where: { id } });
    if (current.status === "CANCELED") return current;
    if (
      !["PENDING", "CONFIRMED"].includes(current.status) ||
      (actorId === current.clientId && current.startsAt <= new Date())
    )
      throw new Error("This booking cannot be canceled");
    const eligible =
      current.status === "PENDING" ||
      refundable(current, actorId === current.trainerId);
    if (eligible && current.passPurchaseId)
      await db.passPurchase.update({
        where: { id: current.passPurchaseId },
        data: { remaining: { increment: 1 } },
      });
    return db.booking.update({
      where: { id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancellationReason: reason,
        proposedStartsAt: null,
        proposedBy: null,
        refundAmount:
          eligible && !current.passPurchaseId ? current.amountPaid : 0,
        refundStatus: current.passPurchaseId
          ? eligible
            ? "CREDIT_RETURNED"
            : "NONE"
          : eligible
            ? "PENDING"
            : "NONE",
      },
    });
  });
  if (b.stripeCheckoutSessionId && !b.stripePaymentIntentId) {
    let session = await getStripeClient().checkout.sessions.retrieve(
      b.stripeCheckoutSessionId,
    );
    if (session.status === "open") {
      try {
        session = await getStripeClient().checkout.sessions.expire(session.id);
      } catch {
        session = await getStripeClient().checkout.sessions.retrieve(
          session.id,
        );
      }
    }
    if (
      session.payment_status === "paid" &&
      typeof session.payment_intent === "string"
    ) {
      await prisma.booking.update({
        where: { id },
        data: { stripePaymentIntentId: session.payment_intent },
      });
    } else if (session.status === "expired")
      await prisma.booking.update({
        where: { id },
        data: { refundStatus: "NONE", refundAmount: 0 },
      });
  }
  await refundBooking(id);
  await notifyBooking(
    id,
    "予約がキャンセルされました。詳細をご確認ください。",
    "A booking was canceled. Please check the details.",
    `canceled:${id}`,
  );
}
