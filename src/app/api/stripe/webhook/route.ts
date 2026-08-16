import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe";
import {
  handleCheckoutSessionCompleted,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe/subscription-webhooks";

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

<<<<<<< HEAD
  if (!secret) {
    throw new Error("Missing required env var: STRIPE_WEBHOOK_SECRET");
  }

  return secret;
}

function purchaseStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE" as const;
    case "canceled":
      return "CANCELED" as const;
    case "incomplete_expired":
      return "EXPIRED" as const;
    default:
      return "PAST_DUE" as const;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const dbUserId = session.metadata?.dbUserId;
  const subscriptionPlanId = session.metadata?.subscriptionPlanId;

  if (!dbUserId || !subscriptionPlanId) return;

  await prisma.subscriptionPurchase.upsert({
    where: { stripeCheckoutSessionId: session.id },
    create: {
      userId: dbUserId,
      subscriptionPlanId,
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
      expiresAt: null,
    },
  });
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  const status = purchaseStatus(subscription.status);
  await prisma.subscriptionPurchase.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status,
      canceledAt: status === "CANCELED" ? new Date() : null,
      expiresAt: status === "EXPIRED" ? new Date() : null,
    },
  });
}

async function handleInvoiceStatus(invoice: Stripe.Invoice, status: "ACTIVE" | "PAST_DUE") {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  if (typeof subscriptionId !== "string") return;

  await prisma.subscriptionPurchase.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status,
      ...(status === "ACTIVE" ? { canceledAt: null, expiresAt: null } : {}),
    },
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  const onboardingComplete =
    account.details_submitted && account.charges_enabled && account.payouts_enabled;

  const stripeAccount = await prisma.stripeAccount.findUnique({
    where: { stripeAccountId: account.id },
    select: { userId: true },
  });
  if (!stripeAccount) return;

  await prisma.$transaction([
    prisma.stripeAccount.update({
      where: { stripeAccountId: account.id },
      data: {
        onboardingStatus: onboardingComplete ? "COMPLETED" : "PENDING",
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
    }),
    prisma.trainerProfile.updateMany({
      where: { userId: stripeAccount.userId },
      data: { isPublished: onboardingComplete },
    }),
  ]);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      getWebhookSecret(),
    );
=======
  if (!signature || !secret) {
    return new Response("Missing Stripe webhook config", { status: 400 });
  }

  const stripe = getStripeClient();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return Response.json({ received: true });
>>>>>>> 9b4ca6c (fixed error)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return Response.json({ error: message }, { status: 500 });
  }

  switch (event.type) {
    case "account.updated":
      await handleAccountUpdated(event.data.object);
      break;
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionChanged(event.data.object);
      break;
    case "invoice.paid":
      await handleInvoiceStatus(event.data.object, "ACTIVE");
      break;
    case "invoice.payment_failed":
      await handleInvoiceStatus(event.data.object, "PAST_DUE");
      break;
  }

  return Response.json({ received: true });
}
