import type { PurchaseStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { notificationService } from "@/lib/notifications/service";
import { fromMinor } from "@/lib/billing/money";
import { calculatePlatformFeeAmount } from "@/lib/billing/fees";
import { refundBooking } from "@/lib/marketplace/bookings";
import { trainerLock } from "@/lib/marketplace/schedule";
import { notify } from "@/lib/marketplace/notifications";
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
      (pass.checkoutSessionId && pass.checkoutSessionId !== session.id)
    )
      return;
    await prisma.$transaction(async (db) => {
      await db.passPurchase.updateMany({
        where: { id: pass.id, status: "PENDING" },
        data: {
          status: "ACTIVE",
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
  await prisma.$transaction(async (db) => {
    await trainerLock(db, original.trainerId);
    const b = await db.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { sessionOffering: true },
    });
    const canceled = b.status === "CANCELED";
    await db.booking.update({
      where: { id: bookingId },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        amountPaid: amount,
        ...(b.status === "PENDING" ? { status: "CONFIRMED" } : {}),
        ...(canceled && !b.stripePaymentIntentId
          ? { refundAmount: amount, refundStatus: "PENDING" }
          : {}),
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
  else
    await Promise.allSettled([
      notificationService.bookingConfirmed(bookingId),
      notificationService.newTrainerBooking(bookingId),
    ]);
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
}
export async function handleChargeRefunded(eventCharge: Stripe.Charge) {
  const charge = await getStripeClient().charges.retrieve(eventCharge.id);
  const paymentIntentId = objectId(charge.payment_intent);
  if (!paymentIntentId) return;
  await prisma.paymentRecord.updateMany({
    where: { paymentIntentId },
    data: { refunded: fromMinor(charge.amount_refunded, charge.currency) },
  });
  if (charge.refunded)
    await prisma.passPurchase.updateMany({
      where: { paymentIntentId },
      data: { status: "REFUNDED", remaining: 0 },
    });
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
