import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { verifyStripeWebhook } from "./webhook-signature";

describe("Stripe webhook signature verification", () => {
  it("accepts a correctly signed payload and rejects tampering", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_signature_verification";
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({
      id: "evt_test_signature",
      object: "event",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });

    expect(verifyStripeWebhook(payload, signature, secret).id).toBe("evt_test_signature");
    expect(() => verifyStripeWebhook(`${payload} `, signature, secret)).toThrow();
  });
});
