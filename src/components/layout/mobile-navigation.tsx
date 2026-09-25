"use client";
import { useState } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "./language-switcher";
import { Menu, X } from "lucide-react";
import type { Locale } from "@/lib/constants/locales";

export function MobileNavigation({
  locale,
  signedIn,
}: {
  locale: Locale;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ja = locale === "ja";
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={
          ja
            ? open
              ? "メニューを閉じる"
              : "メニューを開く"
            : open
              ? "Close menu"
              : "Open menu"
        }
        onClick={() => setOpen(!open)}
        className="grid size-11 place-items-center rounded-xl border border-slate-300 text-slate-700"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </button>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label={ja ? "メインメニュー" : "Main menu"}
          className="absolute inset-x-0 top-full grid gap-1 border-b border-slate-200 bg-white p-4 shadow-lg"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              e.currentTarget.parentElement?.querySelector("button")?.focus();
            }
          }}
        >
          {[
            [`/${locale}/trainers`, ja ? "トレーナーを探す" : "Find a trainer"],
            [`/${locale}#how-it-works`, ja ? "ご利用の流れ" : "How it works"],
            [
              `/${locale}/${signedIn ? "dashboard" : "sign-in"}`,
              ja
                ? signedIn
                  ? "マイページ"
                  : "ログイン"
                : signedIn
                  ? "My workspace"
                  : "Sign in",
            ],
            [
              `/${locale}/onboarding`,
              ja ? "トレーナーとして利用" : "Become a trainer",
            ],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-blue-50"
            >
              {label}
            </Link>
          ))}
          <div className="border-t px-2 pt-3">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </div>
  );
}
