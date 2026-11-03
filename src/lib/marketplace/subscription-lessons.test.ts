import { describe, expect, it } from "vitest";
import { creditCoversSession, validLessonTerms } from "./subscription-lessons";

describe("monthly lesson terms", () => {
  it.each([0, -1, 51, 1.5, NaN, null, undefined])("rejects invalid monthly counts: %s", (count) => {
    expect(validLessonTerms("lesson", count)).toBe(false);
  });
  it("requires an assigned lesson", () => {
    expect(validLessonTerms(null, 4)).toBe(false);
    expect(validLessonTerms("", 4)).toBe(false);
    expect(validLessonTerms("lesson", 4)).toBe(true);
  });
});

describe("paid lesson period", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  const period = {
    status: "ACTIVE",
    validFrom: new Date("2026-11-01T00:00:00Z"),
    expiresAt: new Date("2026-12-01T00:00:00Z"),
  };
  it("accepts a lesson within the paid billing period", () => {
    expect(creditCoversSession(period, new Date("2026-11-20T12:00:00Z"), now)).toBe(true);
  });
  it("rejects use before the paid period opens", () => {
    expect(creditCoversSession(period, new Date("2026-11-20T12:00:00Z"), new Date("2026-10-31T00:00:00Z"))).toBe(false);
  });
  it.each(["2026-10-31T12:00:00Z", "2026-12-01T00:00:00Z", "invalid"])("rejects an uncovered lesson: %s", (date) => {
    expect(creditCoversSession(period, new Date(date), now)).toBe(false);
  });
  it("rejects refunded credits", () => {
    expect(creditCoversSession({ ...period, status: "REFUNDED" }, now, now)).toBe(false);
  });
  it("preserves purchased passes without a billing-period start", () => {
    expect(creditCoversSession({ ...period, validFrom: null }, now, now)).toBe(true);
  });
});
