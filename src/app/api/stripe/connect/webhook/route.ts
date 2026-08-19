import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { verifyStripeWebhook } from "@/lib/stripe/webhook-signature";
import { processStripeWebhookEvent } from "@/lib/stripe/webhook-events";

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

  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(payload, signature, getWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(event, async (claimedEvent) => {
      if (claimedEvent.type === "account.updated") {
        const account = claimedEvent.data.object as Stripe.Account;
        await prisma.stripeAccount.updateMany({
          where: { stripeAccountId: account.id },
          data: {
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          },
        });
      }
    });

    return Response.json({ received: true, duplicate: result === "duplicate" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
