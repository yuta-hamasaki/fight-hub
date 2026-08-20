import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import { PLATFORM_FEE_BPS } from "@/lib/billing/fees";
import { summarizeRevenue, type RevenueTransaction } from "@/lib/billing/revenue";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

function money(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(value);
}

export default async function TrainerRevenuePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") redirect(`/${locale}/dashboard`);

  const [bookings, purchases, stripeAccount] = await Promise.all([
    prisma.booking.findMany({
      where: { trainerId: user.id, status: "COMPLETED", stripePaymentIntentId: { not: null }, amountPaid: { not: null } },
      include: { sessionOffering: true }, orderBy: { startsAt: "desc" }, take: 100,
    }),
    prisma.subscriptionPurchase.findMany({
      where: { subscriptionPlan: { trainerProfile: { userId: user.id } } },
      include: { subscriptionPlan: true }, orderBy: { startedAt: "desc" }, take: 100,
    }),
    prisma.stripeAccount.findUnique({ where: { userId: user.id } }),
  ]);

  const transactions: RevenueTransaction[] = [
    ...bookings.map((booking) => ({ id: booking.id, kind: "session" as const, label: booking.sessionOffering.titleEn, occurredAt: booking.startsAt, gross: Number(booking.amountPaid), currency: booking.currency })),
    ...purchases.map((purchase) => ({ id: purchase.id, kind: "subscription" as const, label: purchase.subscriptionPlan.nameEn, occurredAt: purchase.startedAt, gross: Number(purchase.subscriptionPlan.priceMonthly), currency: purchase.subscriptionPlan.currency })),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const summary = summarizeRevenue(transactions);
  const currency = transactions[0]?.currency ?? "JPY";

  let payouts: Array<{ id: string; amount: number; currency: string; arrivalDate: Date; status: string }> = [];
  let payoutUnavailable = false;
  if (stripeAccount && process.env.STRIPE_SECRET_KEY) {
    try {
      const result = await getStripeClient().payouts.list({ limit: 20 }, { stripeAccount: stripeAccount.stripeAccountId });
      payouts = result.data.map((payout) => ({ id: payout.id, amount: payout.amount / 100, currency: payout.currency.toUpperCase(), arrivalDate: new Date(payout.arrival_date * 1000), status: payout.status }));
    } catch {
      payoutUnavailable = true;
    }
  }

  const ja = locale === "ja";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{ja ? "収益ダッシュボード" : "Revenue dashboard"}</h1><p className="text-sm text-muted-foreground">{ja ? "売上、手数料、手取りとStripeの入金履歴を確認できます。" : "Track sales, fees, net revenue, and Stripe payouts."}</p></div>
        <Link href={`/${locale}/dashboard/trainer`} className={buttonVariants({ variant: "outline" })}>{ja ? "ダッシュボードへ戻る" : "Back to dashboard"}</Link>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [ja ? "売上" : "Gross sales", money(summary.gross, currency, locale)],
          [ja ? `手数料（${PLATFORM_FEE_BPS / 100}%）` : `Platform fees (${PLATFORM_FEE_BPS / 100}%)`, money(summary.fees, currency, locale)],
          [ja ? "手取り" : "Net revenue", money(summary.net, currency, locale)],
          [ja ? "取引件数" : "Transactions", summary.transactionCount.toLocaleString()],
        ].map(([label, value]) => <Card key={label}><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-2xl text-blue-700">{value}</CardTitle></CardHeader></Card>)}
      </section>
      <Card><CardHeader><CardTitle>{ja ? "売上明細" : "Sales history"}</CardTitle><CardDescription>{ja ? "決済済みの完了セッションとサブスクリプション初回購入を表示します。" : "Paid completed sessions and initial subscription purchases."}</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b"><th className="py-2">{ja ? "日付" : "Date"}</th><th>{ja ? "種別" : "Type"}</th><th>{ja ? "内容" : "Description"}</th><th className="text-right">{ja ? "売上" : "Gross"}</th></tr></thead><tbody>{transactions.map((item) => <tr key={`${item.kind}-${item.id}`} className="border-b last:border-0"><td className="py-3">{new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", { dateStyle: "medium" }).format(item.occurredAt)}</td><td>{item.kind === "session" ? (ja ? "セッション" : "Session") : (ja ? "サブスク" : "Subscription")}</td><td>{item.label}</td><td className="text-right font-medium">{money(item.gross, item.currency, locale)}</td></tr>)}{transactions.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">{ja ? "売上はまだありません。" : "No sales yet."}</td></tr> : null}</tbody></table></CardContent></Card>
      <Card><CardHeader><CardTitle>{ja ? "入金履歴" : "Payout history"}</CardTitle><CardDescription>{ja ? "Stripeから銀行口座への直近の入金です。" : "Recent Stripe payouts to your bank account."}</CardDescription></CardHeader><CardContent className="space-y-2">{payouts.map((payout) => <div key={payout.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><div><p className="font-medium">{new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", { dateStyle: "medium" }).format(payout.arrivalDate)}</p><p className="text-muted-foreground">{payout.status} · {payout.id}</p></div><p className="font-semibold">{money(payout.amount, payout.currency, locale)}</p></div>)}{!payouts.length ? <p className="py-4 text-center text-sm text-muted-foreground">{payoutUnavailable ? (ja ? "Stripeの入金履歴を現在取得できません。" : "Stripe payout history is temporarily unavailable.") : (ja ? "入金履歴はまだありません。" : "No payouts yet.")}</p> : null}</CardContent></Card>
    </div>
  );
}
