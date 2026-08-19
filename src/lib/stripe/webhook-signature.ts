import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe";

export function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string,
): Stripe.Event {
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
}
