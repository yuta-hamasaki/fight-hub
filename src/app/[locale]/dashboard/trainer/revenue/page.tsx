import { StatusBadge } from "@/components/marketplace/status-badge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { fromMinor } from "@/lib/billing/money";
import { Panel, Form, Notice } from "@/components/marketplace/forms";
export default async function Revenue({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ page?: string; error?: string; saved?: string }>;
}) {
  const { locale } = await params,
    q = await searchParams,
    user = await requireDbUser(locale),
    ja = locale === "ja";
  if (user.role !== "TRAINER") redirect(`/${locale}/dashboard`);
  const page = Math.max(1, Number.parseInt(q.page || "1") || 1),
    where = { trainerId: user.id };
  const [items, total, totals, account] = await Promise.all([
    prisma.paymentRecord.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    prisma.paymentRecord.count({ where }),
    prisma.paymentRecord.groupBy({
      by: ["currency"],
      where,
      _sum: { amount: true, refunded: true, fee: true },
    }),
    prisma.stripeAccount.findUnique({ where: { userId: user.id } }),
  ]);
  const money = (n: number, c: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: c }).format(n);
  let payouts: {
    id: string;
    amount: number;
    currency: string;
    arrival_date: number;
    status: string;
  }[] = [];
  let unavailable = false;
  if (account && process.env.STRIPE_SECRET_KEY)
    try {
      payouts = (
        await getStripeClient().payouts.list(
          { limit: 20 },
          { stripeAccount: account.stripeAccountId },
        )
      ).data;
    } catch {
      unavailable = true;
    }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {ja ? "収益ダッシュボード" : "Revenue dashboard"}
      </h1>
      <Link
        className="text-blue-700 underline"
        href={`/${locale}/dashboard/trainer`}
      >
        {ja ? "ダッシュボードへ" : "Dashboard"}
      </Link>
      <Notice locale={locale} error={q.error} saved={q.saved} />
      <Form
        locale={locale}
        op="syncRevenue"
        submit={
          ja
            ? "Stripeから過去の決済・契約状態を同期"
            : "Sync historical payments and memberships"
        }
      />
      <Panel title={ja ? "売上・返金" : "Sales and refunds"}>
        <p className="text-sm">
          {ja
            ? "セッション、回数券、毎月の継続課金を決済時点で集計します。通貨ごとに表示します。手取り概算はStripe決済手数料・調整額を含みません。正確な入金はStripeで確認できます。"
            : "Sessions, packages and recurring invoices are counted when paid, grouped by currency. Estimated net excludes Stripe processing fees and adjustments. See Stripe for actual payouts."}
        </p>
        {totals.map((t) => (
          <div
            key={t.currency}
            className="grid gap-3 rounded-lg bg-blue-50 p-4 sm:grid-cols-3"
          >
            <p>
              {ja ? "売上" : "Gross"}:{" "}
              {money(Number(t._sum.amount), t.currency)}
            </p>
            <p>
              {ja ? "返金" : "Refunds"}:{" "}
              {money(Number(t._sum.refunded), t.currency)}
            </p>
            <p>
              {ja
                ? "返金前のプラットフォーム手数料"
                : "Platform fees before refund adjustments"}
              : {money(Number(t._sum.fee), t.currency)}
            </p>
          </div>
        ))}
        {!totals.length && (
          <p>{ja ? "記録された決済はありません。" : "No recorded payments."}</p>
        )}
      </Panel>
      <Panel title={ja ? "決済履歴" : "Payment history"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr>
                <th>{ja ? "日付" : "Date"}</th>
                <th>{ja ? "内容" : "Description"}</th>
                <th>{ja ? "売上" : "Amount"}</th>
                <th>{ja ? "返金" : "Refunded"}</th>
                <th>{ja ? "手取り概算" : "Estimated net"}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const ratio =
                  Number(p.amount) > 0
                    ? Math.max(0, 1 - Number(p.refunded) / Number(p.amount))
                    : 0;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="py-3">
                      {p.occurredAt.toISOString().slice(0, 10)}
                    </td>
                    <td>
                      {p.description} · {p.kind}
                    </td>
                    <td>{money(Number(p.amount), p.currency)}</td>
                    <td>{money(Number(p.refunded), p.currency)}</td>
                    <td>
                      {money(
                        (Number(p.amount) - Number(p.fee)) * ratio,
                        p.currency,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <nav className="flex gap-4">
          {page > 1 && (
            <Link href={`?page=${page - 1}`}>{ja ? "前へ" : "Previous"}</Link>
          )}
          <span>
            {page} / {Math.max(1, Math.ceil(total / 30))}
          </span>
          {page * 30 < total && (
            <Link href={`?page=${page + 1}`}>{ja ? "次へ" : "Next"}</Link>
          )}
        </nav>
      </Panel>
      <Panel title={ja ? "入金履歴" : "Payouts"}>
        {payouts.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap justify-between gap-3 rounded-lg border p-3"
          >
            <span>
              {new Date(p.arrival_date * 1000).toISOString().slice(0, 10)} ·{" "}
              <StatusBadge status={p.status} locale={locale} />
            </span>
            <b>{money(fromMinor(p.amount, p.currency), p.currency)}</b>
          </div>
        ))}
        {!payouts.length && (
          <p>
            {unavailable
              ? ja
                ? "入金履歴を取得できません。Stripeで確認してください。"
                : "Unable to load payouts. Check Stripe."
              : ja
                ? "入金履歴はまだありません。"
                : "No payouts yet."}
          </p>
        )}
        <Link
          className="text-blue-700 underline"
          href={`/${locale}/trainer/dashboard/stripe`}
        >
          {ja ? "Stripeで口座・入金を管理" : "Manage payouts in Stripe"}
        </Link>
      </Panel>
    </div>
  );
}
