import { describe, expect, it } from "vitest";

import { calculatePlatformFeeAmount, platformFeePercent } from "./fees";

describe("platform fees", () => {
  it("calculates six percent in minor units", () => {
    expect(calculatePlatformFeeAmount(10_000)).toBe(600);
    expect(platformFeePercent()).toBe(6);
  });

  it("rounds to the nearest minor unit", () => {
    expect(calculatePlatformFeeAmount(999)).toBe(60);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "returns zero for invalid amount %s",
    (amount) => expect(calculatePlatformFeeAmount(amount)).toBe(0),
  );
});
