import { StatusBadge } from "@/components/marketplace/status-badge";
import Link from "next/link";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import {
  Form,
  Field,
  Hidden,
  Panel,
  Notice,
} from "@/components/marketplace/forms";
import { openBillingPortal } from "../client/actions";
import { TrainerSettings, Coaching, Analytics, Passes } from "./sections";
import { SubmitButton } from "@/components/marketplace/submit-button";
export default async function Workspace({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    filter?: string;
    client?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  const { locale } = await params,
    q = await searchParams,
    user = await requireDbUser(locale),
    ja = locale === "ja",
    trainer = user.role === "TRAINER";
  const tab = q.tab || "bookings",
    page = Math.max(1, Math.min(100000, Number.parseInt(q.page || "1") || 1)),
    size = 20;
  const tabs = [
    ["bookings", "予約", "Bookings"],
    ["messages", "メッセージ", "Messages"],
    ["coaching", trainer ? "顧客・指導管理" : "目標・課題", "Coaching"],
    ["notifications", "通知", "Notifications"],
    ["billing", trainer ? "月額会員" : "契約・請求", "Memberships"],
    ["passes", "回数券", "Session passes"],
    ...(trainer
      ? [
          ["settings", "予約設定", "Availability"],
          ["reviews", "レビュー返信", "Reviews"],
          ["analytics", "集客分析", "Analytics"],
        ]
      : [["favorites", "お気に入り", "Favorites"]]),
    ["support", "サポート", "Support"],
  ];
  const base = `/${locale}/dashboard/workspace`;
  const pages = (total: number, filter = "") => (
    <nav
      className="flex gap-4"
      aria-label={ja ? "ページ切り替え" : "Pagination"}
    >
      {page > 1 && (
        <Link
          className="text-blue-700 underline"
          href={`${base}?tab=${tab}&page=${page - 1}&filter=${filter}`}
        >
          {ja ? "前へ" : "Previous"}
        </Link>
      )}
      <span>
        {page} / {Math.max(1, Math.ceil(total / size))}
      </span>
      {page * size < total && (
        <Link
          className="text-blue-700 underline"
          href={`${base}?tab=${tab}&page=${page + 1}&filter=${filter}`}
        >
          {ja ? "次へ" : "Next"}
        </Link>
      )}
    </nav>
  );
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  const timezone = profile?.timezone || "Asia/Tokyo";
  const date = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(d);
  let content;
  if (tab === "bookings") {
    const filter = ["past", "all"].includes(q.filter || "")
      ? q.filter!
      : "upcoming";
    const where = {
      ...(trainer ? { trainerId: user.id } : { clientId: user.id }),
      ...(filter === "upcoming"
        ? {
            startsAt: { gte: new Date() },
            status: {
              in: ["PENDING", "CONFIRMED"] as ("PENDING" | "CONFIRMED")[],
            },
          }
        : filter === "past"
          ? { startsAt: { lt: new Date() } }
          : {}),
    };
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          sessionOffering: true,
          client: { include: { profile: true } },
          trainer: { include: { profile: true } },
        },
        orderBy: { startsAt: filter === "upcoming" ? "asc" : "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.booking.count({ where }),
    ]);
    content = (
      <Panel title={ja ? "予約一覧" : "Bookings"}>
        <nav
          className="flex gap-2 rounded-xl bg-slate-100 p-1"
          aria-label={ja ? "予約の絞り込み" : "Booking filter"}
        >
          {[
            ["upcoming", "今後", "Upcoming"],
            ["past", "過去", "Past"],
            ["all", "すべて", "All"],
          ].map(([key, j, e]) => (
            <Link
              className={`rounded-lg px-4 py-2 text-sm ${filter === key ? "bg-white font-bold text-blue-800 shadow-sm" : "text-slate-600 hover:bg-white"}`}
              key={key}
              aria-current={filter === key ? "page" : undefined}
              href={`${base}?tab=bookings&filter=${key}`}
            >
              {ja ? j : e}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-slate-500">
          {timezone} · {total} {ja ? "件" : "bookings"}
        </p>
        {bookings.map((b) => (
          <Link
            className="block rounded-lg border p-4 hover:bg-blue-50"
            key={b.id}
            href={`/${locale}/dashboard/bookings/${b.id}`}
          >
            <p className="font-bold">
              {ja
                ? b.sessionOffering.titleJa || b.sessionOffering.titleEn
                : b.sessionOffering.titleEn}
            </p>
            <p>
              {date(b.startsAt)} ·{" "}
              {trainer
                ? b.client.profile?.displayName
                : b.trainer.profile?.displayName}
            </p>
            <p className="text-sm">
              <StatusBadge status={b.status} locale={locale} />{" "}
              {b.proposedStartsAt
                ? ja
                  ? "· 日程変更の提案あり"
                  : "· Reschedule proposed"
                : ""}
            </p>
          </Link>
        ))}
        {!total && <p>{ja ? "該当する予約はありません。" : "No bookings."}</p>}
        {pages(total, filter)}
      </Panel>
    );
  } else if (tab === "settings" && trainer)
    content = <TrainerSettings locale={locale} userId={user.id} />;
  else if (tab === "coaching")
    content = (
      <Coaching
        locale={locale}
        userId={user.id}
        trainer={trainer}
        clientId={q.client}
      />
    );
  else if (tab === "analytics" && trainer)
    content = <Analytics locale={locale} userId={user.id} />;
  else if (tab === "passes")
    content = <Passes locale={locale} userId={user.id} trainer={trainer} />;
  else if (tab === "notifications") {
    const where = { userId: user.id };
    const [items, total] = await Promise.all([
      prisma.appNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.appNotification.count({ where }),
    ]);
    content = (
      <Panel title={ja ? "通知" : "Notifications"}>
        <Form
          locale={locale}
          op="read"
          tab={tab}
          submit={ja ? "すべて既読にする" : "Mark all read"}
        />
        {items.map((n) => (
          <Link
            key={n.id}
            className={`block rounded-lg border p-4 ${n.readAt ? "" : "border-blue-300 bg-blue-50"}`}
            href={`/${locale}${n.path}`}
          >
            <p>{ja ? n.titleJa : n.titleEn}</p>
            <p className="text-xs text-slate-500">{date(n.createdAt)}</p>
          </Link>
        ))}
        {!total && <p>{ja ? "通知はありません。" : "No notifications."}</p>}
        {pages(total)}
      </Panel>
    );
  } else if (tab === "messages") {
    const where = trainer ? { trainerId: user.id } : { clientId: user.id };
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.message.count({ where }),
    ]);
    const ids = [
      ...new Set(messages.flatMap((m) => [m.trainerId, m.clientId])),
    ];
    const people = await prisma.profile.findMany({
      where: { userId: { in: ids } },
    });
    content = (
      <Panel title={ja ? "メッセージ" : "Messages"}>
        {messages.map((m) => (
          <article key={m.id} className="space-y-3 rounded-lg border p-4">
            <p className="font-bold">
              {people.find(
                (p) => p.userId === (trainer ? m.clientId : m.trainerId),
              )?.displayName || (ja ? "メンバー" : "Member")}
            </p>
            <p className="text-xs">
              {m.senderId === user.id
                ? ja
                  ? "送信"
                  : "Sent"
                : ja
                  ? "受信"
                  : "Received"}{" "}
              · {date(m.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
            {m.bookingId && (
              <Link
                className="text-blue-700 underline"
                href={`/${locale}/dashboard/bookings/${m.bookingId}`}
              >
                {ja ? "関連する予約" : "Related booking"}
              </Link>
            )}
            <details>
              <summary className="cursor-pointer text-blue-700">
                {ja ? "返信する" : "Reply"}
              </summary>
              <Form
                locale={locale}
                op="message"
                tab={tab}
                submit={ja ? "送信" : "Send"}
              >
                <Hidden name="trainerId" value={m.trainerId} />
                <Hidden name="clientId" value={m.clientId} />
                {m.bookingId && <Hidden name="bookingId" value={m.bookingId} />}
                <Field
                  label={ja ? "返信" : "Reply"}
                  name="body"
                  type="textarea"
                  required
                />
              </Form>
            </details>
          </article>
        ))}
        {!total && (
          <p>
            {ja
              ? "メッセージはありません。トレーナーの詳細または予約詳細から送信できます。"
              : "No messages. Start a conversation from a trainer or booking page."}
          </p>
        )}
        {pages(total)}
      </Panel>
    );
  } else if (tab === "billing") {
    const where = trainer
      ? { subscriptionPlan: { trainerProfile: { userId: user.id } } }
      : { userId: user.id };
    const [items, total] = await Promise.all([
      prisma.subscriptionPurchase.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          subscriptionPlan: {
            include: {
              trainerProfile: {
                include: { user: { include: { profile: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.subscriptionPurchase.count({ where }),
    ]);
    content = (
      <Panel
        title={
          ja
            ? trainer
              ? "月額会員の管理"
              : "契約・請求"
            : "Memberships and billing"
        }
      >
        {items.map((p) => (
          <article key={p.id} className="space-y-2 rounded-lg border p-4">
            <h3 className="font-bold">
              {ja
                ? p.subscriptionPlan.nameJa || p.subscriptionPlan.nameEn
                : p.subscriptionPlan.nameEn}
            </h3>
            <p>
              {trainer
                ? p.user.profile?.displayName
                : p.subscriptionPlan.trainerProfile.user.profile?.displayName}
            </p>
            <p>
              <StatusBadge status={p.status} locale={locale} /> ·{" "}
              {Number(p.priceMonthly ?? p.subscriptionPlan.priceMonthly)}{" "}
              {p.currency} / {ja ? "月" : "month"}
            </p>
            <p>
              {p.cancelAtPeriodEnd
                ? ja
                  ? "利用終了予定"
                  : "Access ends"
                : ja
                  ? "次回更新予定"
                  : "Next renewal"}
              :{" "}
              {p.currentPeriodEnd
                ? date(p.currentPeriodEnd)
                : ja
                  ? "確認中"
                  : "Awaiting confirmation"}
            </p>
            {p.status === "PAST_DUE" && (
              <p className="text-red-700">
                {ja
                  ? "支払いに失敗しています。支払い方法を確認してください。"
                  : "Payment failed. Please check the payment method."}
              </p>
            )}
            {!trainer && p.stripeCustomerId && (
              <form action={openBillingPortal.bind(null, locale)}>
                <Hidden name="purchaseId" value={p.id} />
                <SubmitButton
                  label={
                    ja
                      ? "支払い方法・解約・請求書を管理"
                      : "Manage payment, cancellation and invoices"
                  }
                  pendingLabel={ja ? "移動中…" : "Opening…"}
                />
              </form>
            )}
          </article>
        ))}
        {!total && <p>{ja ? "契約はありません。" : "No memberships."}</p>}
        {pages(total)}
      </Panel>
    );
  } else if (tab === "favorites" && !trainer) {
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const profiles = await prisma.trainerProfile.findMany({
      where: {
        id: { in: favorites.map((f) => f.trainerProfileId) },
        isPublished: true,
      },
      include: { user: { include: { profile: true } } },
    });
    content = (
      <Panel title={ja ? "お気に入り" : "Favorites"}>
        {profiles.map((p) => (
          <article key={p.id} className="space-y-3 rounded-lg border p-4">
            <Link
              className="font-bold text-blue-700 underline"
              href={`/${locale}/trainers/${p.id}`}
            >
              {p.user.profile?.displayName}
            </Link>
            <Form
              locale={locale}
              op="favorite"
              id={p.id}
              tab={tab}
              submit={ja ? "保存を解除" : "Remove"}
            >
              <Hidden name="remove" value="1" />
            </Form>
          </article>
        ))}
        {!profiles.length && (
          <p>
            {ja
              ? "トレーナー詳細からお気に入りに保存できます。"
              : "Save trainers from their profile pages."}
          </p>
        )}
      </Panel>
    );
  } else if (tab === "reviews" && trainer) {
    const where = { targetUserId: user.id };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { reviewer: { include: { profile: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.review.count({ where }),
    ]);
    content = (
      <Panel title={ja ? "レビューへの返信" : "Reply to reviews"}>
        {items.map((r) => (
          <article key={r.id} className="space-y-3 rounded-lg border p-4">
            <p>
              {r.reviewer.profile?.displayName} · {r.rating}/5
            </p>
            <p className="whitespace-pre-wrap">
              {ja ? r.commentJa || r.commentEn : r.commentEn || r.commentJa}
            </p>
            <Form locale={locale} op="reviewReply" id={r.id} tab={tab}>
              <Field
                label={ja ? "公開返信" : "Public reply"}
                name="reply"
                type="textarea"
                value={r.trainerReply}
              />
            </Form>
          </article>
        ))}
        {!total && <p>{ja ? "レビューはありません。" : "No reviews."}</p>}
        {pages(total)}
      </Panel>
    );
  } else if (tab === "support") {
    const where = user.role === "ADMIN" ? {} : { userId: user.id };
    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.supportTicket.count({ where }),
    ]);
    content = (
      <Panel title={ja ? "サポート" : "Support"}>
        <Form
          locale={locale}
          op="support"
          tab={tab}
          submit={ja ? "問い合わせを送信" : "Submit ticket"}
        >
          <Field label={ja ? "件名" : "Subject"} name="subject" required />
          <Field
            label={
              ja
                ? "相談内容（予約については予約詳細から送信できます）"
                : "Details (use booking details for booking-specific issues)"
            }
            name="body"
            type="textarea"
            required
          />
        </Form>
        {items.map((t) => (
          <article key={t.id} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-bold">{t.subject}</h3>
            <p className="text-xs">
              {t.id} · <StatusBadge status={t.status} locale={locale} /> ·{" "}
              {date(t.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{t.body}</p>
            {t.bookingId && (
              <p className="text-xs">
                {ja ? "予約ID" : "Booking ID"}: {t.bookingId}
              </p>
            )}
            {t.response && (
              <p className="whitespace-pre-wrap rounded-lg bg-blue-50 p-3">
                {t.response}
              </p>
            )}
            {user.role === "ADMIN" && (
              <Form locale={locale} op="supportReply" id={t.id} tab={tab}>
                <Field
                  label={ja ? "回答" : "Response"}
                  name="response"
                  type="textarea"
                  value={t.response}
                  required
                />
                <label>
                  <input
                    type="checkbox"
                    name="resolved"
                    defaultChecked={t.status === "RESOLVED"}
                  />{" "}
                  {ja ? "解決済み" : "Resolved"}
                </label>
              </Form>
            )}
          </article>
        ))}
        {pages(total)}
      </Panel>
    );
  } else
    content = (
      <p>{ja ? "メニューを選択してください。" : "Choose a section."}</p>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {tabs.find(([key]) => key === tab)?.[ja ? 1 : 2] ??
            (ja ? "マイページ" : "My workspace")}
        </h1>
        <Link className="text-blue-700 underline" href={`/${locale}/dashboard`}>
          {ja ? "ダッシュボード" : "Dashboard"}
        </Link>
      </div>

      <Notice locale={locale} error={q.error} saved={q.saved} />
      {content}
    </div>
  );
}
