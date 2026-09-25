import { statusLabel } from "@/lib/marketplace/labels";
import type { Locale } from "@/lib/constants/locales";
export function StatusBadge({
  status,
  locale,
}: {
  status: string;
  locale: Locale;
}) {
  const tone = [
    "CONFIRMED",
    "COMPLETED",
    "ACTIVE",
    "RESOLVED",
    "SUCCEEDED",
    "paid",
    "CREDIT_RETURNED",
  ].includes(status)
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : ["FAILED", "failed", "PAST_DUE", "NO_SHOW"].includes(status)
      ? "border-red-200 bg-red-50 text-red-900"
      : ["PENDING", "pending", "OPEN", "in_transit"].includes(status)
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
    >
      {statusLabel(status, locale)}
    </span>
  );
}
