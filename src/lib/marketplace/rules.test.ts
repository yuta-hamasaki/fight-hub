import { describe, it, expect } from "vitest";
import {
  localToUtc,
  localParts,
  weeklyDates,
  validTimezone,
  refundable,
  canFinishBooking,
  safeUrl,
} from "./rules";
import { toMinor, fromMinor } from "@/lib/billing/money";
describe("local booking time and policies", () => {
  it("converts Tokyo local times without relying on the server timezone", () => {
    expect(localToUtc("2026-10-05T09:30", "Asia/Tokyo").toISOString()).toBe(
      "2026-10-05T00:30:00.000Z",
    );
  });
  it("keeps a weekly booking at the same local time across DST", () => {
    const dates = weeklyDates(
      new Date("2026-10-25T16:00:00Z"),
      2,
      "America/Vancouver",
    );
    expect(dates[1].toISOString()).toBe("2026-11-01T17:00:00.000Z");
    expect(localParts(dates[1], "America/Vancouver").minute).toBe(540);
  });
  it("rejects a nonexistent spring-forward local time", () => {
    expect(() => localToUtc("2026-03-08T02:30", "America/Vancouver")).toThrow();
  });
  it("rejects invalid dates, timezone and recurrence lengths", () => {
    expect(validTimezone("not-a-zone")).toBe(false);
    expect(() => localToUtc("2026-02-31T12:00", "UTC")).toThrow();
    expect(() => weeklyDates(new Date(), 13, "UTC")).toThrow();
  });
  it("enforces the snapshotted cancellation cutoff but allows trainer refunds", () => {
    const b = {
      startsAt: new Date("2026-10-02T12:00Z"),
      cancelBefore: new Date("2026-10-01T12:00Z"),
    };
    expect(refundable(b, false, new Date("2026-10-01T12:00Z"))).toBe(true);
    expect(refundable(b, false, new Date("2026-10-01T12:01Z"))).toBe(false);
    expect(refundable(b, true, new Date("2026-10-02T13:00Z"))).toBe(true);
  });
  it("only finishes paid/credited sessions after their end", () => {
    const ended = new Date("2026-01-01");
    expect(canFinishBooking("PENDING", ended)).toBe(false);
    expect(canFinishBooking("CANCELED", ended)).toBe(false);
    expect(canFinishBooking("CONFIRMED", new Date("2100-01-01"))).toBe(false);
    expect(canFinishBooking("CONFIRMED", ended)).toBe(true);
  });
  it("only allows HTTPS joining links", () => {
    expect(() => safeUrl("javascript:alert(1)")).toThrow();
    expect(safeUrl("https://example.com/meeting")).toBe(
      "https://example.com/meeting",
    );
    expect(safeUrl("")).toBeNull();
  });
  it("charges JPY in yen and USD in cents", () => {
    expect(toMinor(5000, "JPY")).toBe(5000);
    expect(toMinor(12.34, "usd")).toBe(1234);
    expect(fromMinor(5000, "jpy")).toBe(5000);
    expect(fromMinor(1234, "USD")).toBe(12.34);
  });
});
