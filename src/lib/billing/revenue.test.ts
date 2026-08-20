import { describe, expect, it } from "vitest";

import { summarizeRevenue } from "./revenue";

describe("summarizeRevenue", () => {
  it("calculates gross, the platform fee, and trainer net revenue", () => {
    const summary = summarizeRevenue([
      { id: "booking", kind: "session", label: "Private lesson", occurredAt: new Date(), gross: 10_000, currency: "JPY" },
      { id: "plan", kind: "subscription", label: "Monthly plan", occurredAt: new Date(), gross: 5_000, currency: "JPY" },
    ]);

    expect(summary).toEqual({ gross: 15_000, fees: 900, net: 14_100, transactionCount: 2 });
  });
});
