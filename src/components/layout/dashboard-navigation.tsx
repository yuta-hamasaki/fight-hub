"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Target,
  Bell,
  CreditCard,
  Ticket,
  Heart,
  Settings,
  Star,
  ChartNoAxesCombined,
  LifeBuoy,
  BookOpen,
  Wallet,
} from "lucide-react";
import type { Locale } from "@/lib/constants/locales";

export function DashboardNavigation({
  locale,
  trainer,
}: {
  locale: Locale;
  trainer: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const ja = locale === "ja";
  const root = `/${locale}/dashboard`;
  const role = trainer ? "trainer" : "client";
  const items = [
    {
      href: `${root}/${role}`,
      ja: "ホーム",
      en: "Overview",
      icon: LayoutDashboard,
    },
    ...[
      ["bookings", "予約", "Bookings", CalendarDays],
      ["messages", "メッセージ", "Messages", MessageSquare],
      ["coaching", trainer ? "顧客・指導" : "目標・課題", "Coaching", Target],
      [
        "billing",
        trainer ? "月額会員" : "契約・請求",
        "Memberships",
        CreditCard,
      ],
      ["passes", "回数券", "Session passes", Ticket],
      ...(trainer
        ? ([
            ["settings", "予約設定", "Availability", Settings],
            ["reviews", "レビュー", "Reviews", Star],
            ["analytics", "集客分析", "Analytics", ChartNoAxesCombined],
          ] as const)
        : ([["favorites", "お気に入り", "Favorites", Heart]] as const)),
    ].map(([tab, j, en, icon]) => ({
      href: `${root}/workspace?tab=${tab}`,
      ja: j as string,
      en: en as string,
      icon: icon as typeof CalendarDays,
    })),
    {
      href: `${root}/${role}/content`,
      ja: "会員コンテンツ",
      en: "Member content",
      icon: BookOpen,
    },
    ...(trainer
      ? [
          {
            href: `${root}/trainer/revenue`,
            ja: "売上・入金",
            en: "Revenue",
            icon: Wallet,
          },
          {
            href: `/${locale}/trainer/dashboard/stripe`,
            ja: "支払い受取設定",
            en: "Payout settings",
            icon: CreditCard,
          },
        ]
      : []),
    {
      href: `${root}/workspace?tab=notifications`,
      ja: "通知",
      en: "Notifications",
      icon: Bell,
    },
    {
      href: `${root}/workspace?tab=support`,
      ja: "サポート",
      en: "Support",
      icon: LifeBuoy,
    },
  ];
  const active = (href: string) => {
    const [path, query] = href.split("?");
    if (query)
      return (
        (query === "tab=bookings" &&
          pathname.startsWith(`${root}/bookings/`)) ||
        (pathname === path &&
          (search.get("tab") || "bookings") ===
            new URLSearchParams(query).get("tab"))
      );
    return (
      pathname === path ||
      (path.endsWith("/content") && pathname.startsWith(`${path}/`))
    );
  };
  return (
    <nav
      aria-label={ja ? "マイページメニュー" : "Workspace navigation"}
      className="rounded-2xl border border-slate-200 bg-white p-2 lg:sticky lg:top-6"
    >
      <p className="px-3 py-3 text-xs font-bold tracking-wider text-slate-500">
        {trainer
          ? ja
            ? "トレーナー管理"
            : "TRAINER WORKSPACE"
          : ja
            ? "マイページ"
            : "MY WORKSPACE"}
      </p>
      <label className="grid gap-2 px-2 pb-2 text-sm font-medium lg:hidden">
        <span className="sr-only">
          {ja ? "表示するページ" : "Choose a page"}
        </span>
        <select
          className="w-full border px-3 py-2"
          value={items.find((item) => active(item.href))?.href ?? ""}
          onChange={(e) => router.push(e.target.value)}
        >
          <option value="" disabled>
            {ja ? "メニューを選択" : "Choose a section"}
          </option>
          {items.map((item) => (
            <option key={item.href} value={item.href}>
              {ja ? item.ja : item.en}
            </option>
          ))}
        </select>
      </label>
      <div className="hidden gap-1 lg:flex lg:flex-col">
        {items.map(({ href, ja: j, en, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active(href) ? "bg-blue-50 font-bold text-blue-800 ring-1 ring-inset ring-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            {ja ? j : en}
          </Link>
        ))}
      </div>
    </nav>
  );
}
