import { describe, expect, it } from "vitest";

import { notificationMessages } from "./messages";

const booking = {
  startsAt: new Date("2026-08-25T18:00:00.000Z"),
  offeringTitle: "Boxing",
  durationMinutes: 60,
  trainerName: "John",
  amount: 8000,
  currency: "JPY",
  url: "https://example.com/en/dashboard/client",
};

describe("LINE notification messages", () => {
  it("formats client messages in Japanese from the recipient locale", () => {
    const message = notificationMessages.bookingConfirmed("ja", booking);
    expect(message).toContain("予約が完了しました");
    expect(message).toContain("60分");
  });

  it("formats client and trainer messages in English", () => {
    expect(notificationMessages.bookingConfirmed("en", booking)).toContain("Booking confirmed");
    expect(notificationMessages.trainerNewBooking("en", booking)).toContain("New booking");
  });

  it("formats reminders and review requests in both locales", () => {
    expect(notificationMessages.bookingReminder("ja", booking)).toContain("24時間後");
    expect(notificationMessages.bookingReminder("en", booking)).toContain("in 24 hours");
    expect(notificationMessages.reviewRequest("ja", "山田", booking.url)).toContain("レビュー");
    expect(notificationMessages.reviewRequest("en", "John", booking.url)).toContain("Write a review");
  });
});
