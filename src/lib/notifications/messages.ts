import type { Locale } from "@/lib/constants/locales";

export type BookingMessageData = {
  startsAt: Date;
  offeringTitle: string;
  durationMinutes: number;
  trainerName?: string;
  amount?: number;
  currency?: string;
  url: string;
};

function date(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export const notificationMessages = {
  bookingConfirmed(locale: Locale, data: BookingMessageData) {
    return locale === "ja"
      ? `🥊 予約が完了しました\n\n${data.trainerName ?? "トレーナー"}\n\n${data.offeringTitle}\n${data.durationMinutes}分\n\n${date(data.startsAt, locale)}\n\n予約詳細を見る\n${data.url}`
      : `🥊 Booking confirmed\n\n${data.trainerName ?? "Trainer"}\n\n${data.offeringTitle}\n${data.durationMinutes} minutes\n\n${date(data.startsAt, locale)}\n\nView booking\n${data.url}`;
  },
  trainerNewBooking(locale: Locale, data: BookingMessageData) {
    const money = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: data.currency ?? "JPY",
    }).format(data.amount ?? 0);
    return locale === "ja"
      ? `🎉 新しい予約が入りました\n\n${date(data.startsAt, locale)}\n\n${data.offeringTitle}\n${data.durationMinutes}分\n\n${money}\n\n予約詳細を見る\n${data.url}`
      : `🎉 New booking\n\n${date(data.startsAt, locale)}\n\n${data.offeringTitle}\n${data.durationMinutes} minutes\n\n${money}\n\nView booking\n${data.url}`;
  },
  bookingReminder(locale: Locale, data: BookingMessageData) {
    return locale === "ja"
      ? `🥊 トレーニングは24時間後です\n\n${data.offeringTitle}\n${date(data.startsAt, locale)}\n\n予約詳細を見る\n${data.url}`
      : `🥊 Your training session is in 24 hours\n\n${data.offeringTitle}\n${date(data.startsAt, locale)}\n\nView booking\n${data.url}`;
  },
  reviewRequest(locale: Locale, trainerName: string, url: string) {
    return locale === "ja"
      ? `🥊 今日のトレーニングはいかがでしたか？\n\n${trainerName}コーチへのレビューをお願いします。\n\nレビューを書く\n${url}`
      : `🥊 How was your training session?\n\nLeave a review for ${trainerName}.\n\nWrite a review\n${url}`;
  },
};
