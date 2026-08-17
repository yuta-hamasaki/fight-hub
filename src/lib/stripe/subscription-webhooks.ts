import type { PurchaseStatus } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): PurchaseStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete_expired":
      return "EXPIRED";
    default:
      return "EXPIRED";
  }
}

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return;
  }

  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return;
  }

  const dbUserId = session.metadata?.dbUserId;
  const subscriptionPlanId = session.metadata?.subscriptionPlanId;
  const trainerProfileId = session.metadata?.trainerProfileId;

  if (!dbUserId || !subscriptionPlanId) {
    return;
  }

  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: dbUserId }, select: { id: true } }),
    prisma.subscriptionPlan.findFirst({
      where: { id: subscriptionPlanId, isActive: true },
      select: { id: true, trainerProfileId: true },
    }),
  ]);

  if (!user || !plan) {
    return;
  }

  if (trainerProfileId && trainerProfileId !== plan.trainerProfileId) {
    return;
  }

  await prisma.subscriptionPurchase.upsert({
    where: {
      stripeCheckoutSessionId: session.id,
    },
    create: {
      userId: dbUserId,
      subscriptionPlanId: plan.id,
      status: "ACTIVE",
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      startedAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      canceledAt: null,
    },
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = mapStripeSubscriptionStatus(subscription.status);

  await prisma.subscriptionPurchase.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status,
      canceledAt: status === "CANCELED" ? new Date() : null,
    },
  });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscriptionPurchase.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;

  if (!subscriptionId) {
    return;
  }

  await prisma.subscriptionPurchase.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: "PAST_DUE",
    },
  });
}
