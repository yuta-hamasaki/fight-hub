import { describe, expect, it } from "vitest";

import { mapStripeSubscriptionStatus } from "./subscription-webhooks";

describe("Stripe subscription status mapping", () => {
  it.each([
    ["active", "ACTIVE"],
    ["trialing", "ACTIVE"],
    ["past_due", "PAST_DUE"],
    ["unpaid", "PAST_DUE"],
    ["canceled", "CANCELED"],
    ["incomplete_expired", "EXPIRED"],
    ["incomplete", "EXPIRED"],
  ] as const)("maps %s to %s", (stripeStatus, expected) => {
    expect(mapStripeSubscriptionStatus(stripeStatus)).toBe(expected);
  });
});
