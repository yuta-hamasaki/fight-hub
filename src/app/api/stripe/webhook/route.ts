import type Stripe from "stripe";

import { verifyStripeWebhook } from "@/lib/stripe/webhook-signature";
import { processStripeWebhookEvent } from "@/lib/stripe/webhook-events";
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe/subscription-webhooks";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return new Response("Missing Stripe webhook config", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(event, async (claimedEvent) => {
      switch (claimedEvent.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(claimedEvent.data.object);
          break;
        case "checkout.session.expired":
          await handleCheckoutSessionExpired(claimedEvent.data.object);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(claimedEvent.data.object);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(claimedEvent.data.object);
          break;
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(claimedEvent.data.object);
          break;
        default:
          break;
      }
    });

    return Response.json({ received: true, duplicate: result === "duplicate" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
