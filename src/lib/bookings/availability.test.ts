import { describe, expect, it } from "vitest";

import { intervalsOverlap, isWithinAvailability } from "./availability";

const date = (iso: string) => new Date(iso);

describe("booking availability", () => {
  it("detects overlap but allows adjacent sessions", () => {
    const existing = { startsAt: date("2026-08-19T10:00:00Z"), endsAt: date("2026-08-19T11:00:00Z") };
    expect(intervalsOverlap(existing, { startsAt: date("2026-08-19T10:30:00Z"), endsAt: date("2026-08-19T11:30:00Z") })).toBe(true);
    expect(intervalsOverlap(existing, { startsAt: date("2026-08-19T11:00:00Z"), endsAt: date("2026-08-19T12:00:00Z") })).toBe(false);
  });

  it("accepts sessions fully contained in a weekly window", () => {
    expect(isWithinAvailability(
      { startsAt: date("2026-08-19T10:00:00Z"), endsAt: date("2026-08-19T11:00:00Z") },
      [{ dayOfWeek: 3, startMinute: 9 * 60, endMinute: 12 * 60 }],
    )).toBe(true);
  });

  it("rejects sessions outside or crossing the UTC day boundary", () => {
    const windows = [{ dayOfWeek: 3, startMinute: 9 * 60, endMinute: 12 * 60 }];
    expect(isWithinAvailability({ startsAt: date("2026-08-19T08:30:00Z"), endsAt: date("2026-08-19T09:30:00Z") }, windows)).toBe(false);
    expect(isWithinAvailability({ startsAt: date("2026-08-19T23:30:00Z"), endsAt: date("2026-08-20T00:30:00Z") }, windows)).toBe(false);
  });

  it("keeps the existing unrestricted behavior when no windows exist", () => {
    expect(isWithinAvailability(
      { startsAt: date("2026-08-19T10:00:00Z"), endsAt: date("2026-08-19T11:00:00Z") },
      [],
    )).toBe(true);
  });
});
