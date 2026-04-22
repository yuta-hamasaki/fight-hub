import Stripe from "stripe";

import { getPrismaClient } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

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

  const prisma = getPrismaClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const dbUserId = session.metadata?.dbUserId;
    const subscriptionPlanId = session.metadata?.subscriptionPlanId;

    if (dbUserId && subscriptionPlanId) {
      await prisma.subscriptionPurchase.upsert({
        where: {
          stripeCheckoutSessionId: session.id,
        },
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
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await prisma.subscriptionPurchase.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });
  }

  return Response.json({ received: true });
import { getPrismaClient } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/connect";

function getWebhookSecret() {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing required env var: STRIPE_CONNECT_WEBHOOK_SECRET");
  }

  return secret;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());

    if (event.type === "account.updated") {
      const account = event.data.object;
      const prisma = getPrismaClient();

      await prisma.stripeAccount.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        },
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return Response.json({ error: message }, { status: 400 });
  }
}
