import type { Locale } from "@/lib/constants/locales";
const labels: Record<string, [string, string]> = {
  PENDING: ["確認待ち", "Pending"],
  CONFIRMED: ["予約確定", "Confirmed"],
  COMPLETED: ["受講完了", "Completed"],
  CANCELED: ["キャンセル済み", "Canceled"],
  NO_SHOW: ["欠席", "No-show"],
  ACTIVE: ["有効", "Active"],
  PAST_DUE: ["支払い待ち", "Payment overdue"],
  EXPIRED: ["期限切れ", "Expired"],
  REFUNDED: ["返金済み", "Refunded"],
  NONE: ["返金なし", "No refund"],
  SUCCEEDED: ["返金完了", "Refund completed"],
  FAILED: ["処理失敗・再確認が必要", "Failed — retry required"],
  CREDIT_RETURNED: ["回数返却済み", "Credit returned"],
  OPEN: ["受付中", "Open"],
  RESOLVED: ["解決済み", "Resolved"],
  pending: ["入金待ち", "Pending payout"],
  in_transit: ["送金中", "In transit"],
  paid: ["入金済み", "Paid"],
  failed: ["入金失敗", "Payout failed"],
  canceled: ["入金キャンセル", "Payout canceled"],
};
export function statusLabel(status: string, locale: Locale) {
  return (
    labels[status]?.[locale === "ja" ? 0 : 1] ??
    (locale === "ja" ? "確認中" : "Awaiting confirmation")
  );
}
