import type { PurchaseStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { fromMinor } from "@/lib/billing/money";
import { calculatePlatformFeeAmount } from "@/lib/billing/fees";
import { refundBooking } from "@/lib/marketplace/bookings";
import { paymentLock, trainerLock, userLock } from "@/lib/marketplace/schedule";
import { validLessonTerms } from "@/lib/marketplace/subscription-lessons";
import { toMinor } from "@/lib/billing/money";
import { notify, notifyBooking } from "@/lib/marketplace/notifications";
export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): PurchaseStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "EXPIRED";
  }
}
const objectId = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : (value?.id ?? null);
export async function handleSubscriptionUpdated(
  eventSubscription: Stripe.Subscription,
) {
  // Read current Stripe state so delayed webhook events cannot resurrect a canceled contract.
  const subscription = await getStripeClient().subscriptions.retrieve(
    eventSubscription.id,
  );
  const userId = subscription.metadata.dbUserId,
    planId = subscription.metadata.subscriptionPlanId;
  if (!userId || !planId) return;
  const item = subscription.items.data[0],
    status = mapStripeSubscriptionStatus(subscription.status);
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
  if (!plan) return;
  const data = {
    status,
    stripeCustomerId: objectId(subscription.customer),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    priceMonthly: item
      ? fromMinor(item.price.unit_amount ?? 0, item.price.currency) *
        (item.quantity ?? 1)
      : Number(plan.priceMonthly),
    currency: item?.price.currency.toUpperCase() ?? plan.currency,
    canceledAt:
      status === "CANCELED"
        ? new Date(
            (subscription.canceled_at ?? Math.floor(Date.now() / 1000)) * 1000,
          )
        : null,
  };
  await prisma.subscriptionPurchase.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      subscriptionPlanId: planId,
      stripeSubscriptionId: subscription.id,
      ...data,
    },
    update: data,
  });
}
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
) {
  await handleSubscriptionUpdated(subscription);
}
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  )
    return;
  if (session.mode === "subscription") {
    const id = objectId(session.subscription);
    if (!id) return;
    const sub = await getStripeClient().subscriptions.retrieve(id);
    await handleSubscriptionUpdated(sub);
    await prisma.subscriptionPurchase.updateMany({
      where: { stripeSubscriptionId: id },
      data: { stripeCheckoutSessionId: session.id },
    });
    await prisma.subscriptionCheckout.deleteMany({
      where: { sessionId: session.id },
    });
    return;
  }
  if (session.mode !== "payment") return;
  const paymentIntentId = objectId(session.payment_intent),
    currency = (session.currency ?? "jpy").toUpperCase(),
    amount = fromMinor(session.amount_total ?? 0, currency);
  if (session.metadata?.passId) {
    const pass = await prisma.passPurchase.findUnique({
      where: { id: session.metadata.passId },
    });
    if (
      !pass ||
      pass.subscriptionPurchaseId ||
      (pass.checkoutSessionId && pass.checkoutSessionId !== session.id)
    )
      return;
    if (!paymentIntentId || session.currency?.toUpperCase() !== pass.currency.toUpperCase() || session.amount_total !== toMinor(Number(pass.amount), pass.currency))
      throw new Error("Session pass payment does not match the purchase");
    const wasRefunded = await prisma.$transaction(async (db) => {
      await paymentLock(db, paymentIntentId);
      await trainerLock(db, pass.trainerId);
      const refunded = await db.refundedPayment.findUnique({ where: { paymentIntentId } });
      await db.passPurchase.updateMany({
        where: { id: pass.id, status: "PENDING" },
        data: {
          status: refunded ? "REFUNDED" : "ACTIVE",
          ...(refunded ? { remaining: 0 } : {}),
          checkoutSessionId: session.id,
          paymentIntentId,
          expiresAt: new Date(
            session.created * 1000 + pass.validityDays * 86400000,
          ),
        },
      });
      await db.paymentRecord.upsert({
        where: { id: session.id },
        create: {
          id: session.id,
          trainerId: pass.trainerId,
          clientId: pass.userId,
          kind: "package",
          description: pass.title,
          amount,
          refunded: refunded ? amount : 0,
          currency,
          paymentIntentId,
          fee: fromMinor(
            calculatePlatformFeeAmount(session.amount_total ?? 0),
            currency,
          ),
        },
        update: {},
      });
      return Boolean(refunded);
    });
    if (wasRefunded) return;
    await notify(
      pass.userId,
      "回数券の購入が完了しました",
      "Your session pass is ready",
      "/dashboard/workspace?tab=passes",
      `pass:${pass.id}`,
    );
    return;
  }
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;
  const original = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (
    !original ||
    (original.stripeCheckoutSessionId &&
      original.stripeCheckoutSessionId !== session.id)
  )
    return;
  if (!paymentIntentId || session.currency?.toUpperCase() !== original.currency.toUpperCase() || session.amount_total !== toMinor(Number(original.amountPaid), original.currency))
    throw new Error("Booking payment does not match the reservation");
  await prisma.$transaction(async (db) => {
    await paymentLock(db, paymentIntentId);
    await trainerLock(db, original.trainerId);
    const b = await db.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { sessionOffering: true },
    });
    const canceled = b.status === "CANCELED";
    const refunded = await db.refundedPayment.findUnique({ where: { paymentIntentId } });
    await db.booking.update({
      where: { id: bookingId },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        amountPaid: amount,
        holdExpiresAt: null,
        ...(canceled && !b.stripePaymentIntentId
          ? { refundAmount: amount, refundStatus: "PENDING" }
          : {}),
        ...(refunded ? { status: "CANCELED", canceledAt: b.canceledAt ?? new Date(), refundStatus: "SUCCEEDED", refundAmount: amount } : {}),
      },
    });
    await db.paymentRecord.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        trainerId: b.trainerId,
        clientId: b.clientId,
        kind: "session",
        description: b.sessionOffering.titleEn,
        amount,
        refunded: refunded ? amount : 0,
        currency,
        paymentIntentId,
        fee: fromMinor(
          calculatePlatformFeeAmount(session.amount_total ?? 0),
          currency,
        ),
      },
      update: {},
    });
  });
  const b = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });
  if (b.status === "CANCELED") await refundBooking(bookingId);
  else if (b.status === "PENDING")
    await notifyBooking(
      bookingId,
      "決済が完了しました。予約リクエストはトレーナーの承認待ちです。",
      "Payment received. Your booking request is awaiting trainer approval.",
      `requested:${bookingId}`,
    );
}
export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
) {
  await prisma.subscriptionCheckout.deleteMany({
    where: { sessionId: session.id },
  });
  if (session.mode === "payment") {
    await prisma.booking.updateMany({
      where: {
        stripeCheckoutSessionId: session.id,
        status: "PENDING",
        stripePaymentIntentId: null,
      },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancellationReason: "Checkout expired",
      },
    });
    await prisma.passPurchase.updateMany({
      where: { checkoutSessionId: session.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  }
}
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const id = objectId(invoice.parent?.subscription_details?.subscription);
  if (!id) return;
  const sub = await getStripeClient().subscriptions.retrieve(id);
  await handleSubscriptionUpdated(sub);
  const p = await prisma.subscriptionPurchase.findUnique({
    where: { stripeSubscriptionId: id },
  });
  if (p?.status === "PAST_DUE")
    await notify(
      p.userId,
      "月額プランのお支払い方法を確認してください",
      "Please update your membership payment method",
      "/dashboard/workspace?tab=billing",
      `invoice-failed:${invoice.id}`,
    );
}
export async function handleInvoicePaid(eventInvoice: Stripe.Invoice) {
  const id = objectId(eventInvoice.parent?.subscription_details?.subscription);
  if (!id) return;
  const stripe = getStripeClient(),
    sub = await stripe.subscriptions.retrieve(id);
  await handleSubscriptionUpdated(sub);
  const purchase = await prisma.subscriptionPurchase.findUnique({
    where: { stripeSubscriptionId: id },
    include: { subscriptionPlan: { include: { trainerProfile: true } } },
  });
  if (!purchase) return;
  const invoice = await stripe.invoices.retrieve(eventInvoice.id, {
    expand: ["payments"],
  });
  if (invoice.status !== "paid") return;
  const paymentIntentId = objectId(
    invoice.payments?.data.find((p) => p.status === "paid")?.payment
      .payment_intent,
  );
  const currency = invoice.currency.toUpperCase();
  await prisma.paymentRecord.upsert({
    where: { id: invoice.id },
    create: {
      id: invoice.id,
      trainerId: purchase.subscriptionPlan.trainerProfile.userId,
      clientId: purchase.userId,
      kind: "subscription",
      description: purchase.subscriptionPlan.nameEn,
      amount: fromMinor(invoice.amount_paid, currency),
      fee: fromMinor(
        Math.round(
          (invoice.amount_paid * (sub.application_fee_percent ?? 0)) / 100,
        ),
        currency,
      ),
      currency,
      paymentIntentId,
      occurredAt: new Date(
        (invoice.status_transitions.paid_at ?? invoice.created) * 1000,
      ),
    },
    update: {},
  });
  // Only a paid regular billing period grants lessons. Checkout completion,
  // retries, prorations and plan edits must never replenish used credits.
  const offeringId = sub.metadata.sessionOfferingId;
  const sessions = Number(sub.metadata.sessionsPerMonth);
  if (!validLessonTerms(offeringId, sessions)) return;
  if (invoice.status !== "paid" || !["subscription_create", "subscription_cycle"].includes(invoice.billing_reason ?? "")) return;
  const subscriptionItemId = sub.items.data[0]?.id;
  const line = invoice.lines.data.find((l) =>
    subscriptionItemId && l.parent?.subscription_item_details?.subscription_item === subscriptionItemId &&
    !l.parent?.subscription_item_details?.proration,
  );
  if (!line || line.period.end <= line.period.start) throw new Error("Missing subscription lesson period");
  const offering = await prisma.sessionOffering.findFirst({
    where: { id: offeringId, trainerProfileId: purchase.subscriptionPlan.trainerProfileId, isTrial: false },
  });
  if (!offering) throw new Error("Subscription lesson does not belong to this trainer");
  const available = await prisma.$transaction(async (db) => {
    if (paymentIntentId) await paymentLock(db, paymentIntentId);
    await trainerLock(db, offering.trainerUserId);
    await userLock(db, purchase.userId);
    const refunded = paymentIntentId ? await db.refundedPayment.findUnique({ where: { paymentIntentId } }) : null;
    await db.passPurchase.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        userId: purchase.userId,
        trainerId: offering.trainerUserId,
        offeringId: offering.id,
        subscriptionPurchaseId: purchase.id,
        stripeInvoiceId: invoice.id,
        title: purchase.subscriptionPlan.nameEn,
        credits: sessions,
        remaining: refunded ? 0 : sessions,
        amount: fromMinor(invoice.amount_paid, currency),
        currency,
        paymentIntentId,
        validityDays: Math.ceil((line.period.end - line.period.start) / 86400),
        validFrom: new Date(line.period.start * 1000),
        expiresAt: new Date(line.period.end * 1000),
        status: refunded ? "REFUNDED" : "ACTIVE",
      },
      update: {},
    });
    if (refunded) await db.paymentRecord.updateMany({ where: { id: invoice.id }, data: { refunded: fromMinor(invoice.amount_paid, currency) } });
    return !refunded;
  });
  if (!available) return;
  await notify(purchase.userId,
    "月額レッスンの回数が付与されました。利用期間内のレッスンを予約できます。",
    "Your monthly lesson credits are ready. Book within the paid billing period.",
    "/dashboard/workspace?tab=passes", `lesson-invoice:${invoice.id}`);
}
export async function handleChargeRefunded(eventCharge: Stripe.Charge) {
  const charge = await getStripeClient().charges.retrieve(eventCharge.id);
  const paymentIntentId = objectId(charge.payment_intent);
  if (!paymentIntentId) return;
  await prisma.paymentRecord.updateMany({
    where: { paymentIntentId },
    data: { refunded: fromMinor(charge.amount_refunded, charge.currency) },
  });
  if (charge.refunded) {
    await prisma.$transaction(async (db) => {
      await paymentLock(db, paymentIntentId);
      await db.refundedPayment.upsert({ where: { paymentIntentId }, create: { paymentIntentId }, update: {} });
      const credits = await db.passPurchase.findMany({ where: { paymentIntentId } });
      for (const credit of credits) {
        await trainerLock(db, credit.trainerId);
        await userLock(db, credit.userId);
        await db.passPurchase.update({ where: { id: credit.id }, data: { status: "REFUNDED", remaining: 0 } });
        await db.booking.updateMany({
          where: { passPurchaseId: credit.id, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gt: new Date() } },
          data: { status: "CANCELED", canceledAt: new Date(), cancellationReason: "Lesson credit payment was refunded", proposedStartsAt: null, proposedBy: null },
        });
      }
      const bookings = await db.booking.findMany({ where: { stripePaymentIntentId: paymentIntentId } });
      for (const booking of bookings) {
        await trainerLock(db, booking.trainerId);
        await db.booking.update({ where: { id: booking.id }, data: {
          ...(["PENDING", "CONFIRMED"].includes(booking.status) ? { status: "CANCELED", canceledAt: new Date(), proposedStartsAt: null, proposedBy: null } : {}),
          refundStatus: "SUCCEEDED", refundAmount: booking.amountPaid,
        } });
      }
    });
  }
}
export async function handleRefundUpdated(eventRefund: Stripe.Refund) {
  const refund = await getStripeClient().refunds.retrieve(eventRefund.id),
    id = refund.metadata?.bookingId;
  if (!id) return;
  await prisma.booking.updateMany({
    where: {
      id,
      stripePaymentIntentId: objectId(refund.payment_intent),
      refundStatus: { not: "SUCCEEDED" },
      OR: [{ stripeRefundId: null }, { stripeRefundId: refund.id }],
    },
    data: {
      stripeRefundId: refund.id,
      refundStatus:
        refund.status === "succeeded"
          ? "SUCCEEDED"
          : refund.status === "failed" || refund.status === "canceled"
            ? "FAILED"
            : "PENDING",
    },
  });
}
