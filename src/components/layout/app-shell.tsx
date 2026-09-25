import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Bell, Dumbbell } from "lucide-react";
import type { ReactNode } from "react";

import { MobileNavigation } from "./mobile-navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";

export async function AppShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const copy = dictionary[locale];
  const { userId } = await auth();

  return (
    <div lang={locale} className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        {locale === "ja" ? "本文へ移動" : "Skip to content"}
      </a>
      <header className="relative z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={`/${locale}`}
            className="flex shrink-0 items-center gap-2 text-lg font-black sm:text-xl tracking-tight text-[#09213f]"
          >
            <span className="grid size-9 place-items-center -skew-x-12 rounded-md bg-blue-700 text-white">
              <Dumbbell className="size-5 skew-x-12" />
            </span>
            {copy.appName}
          </Link>
          <nav
            aria-label={locale === "ja" ? "メインメニュー" : "Main navigation"}
            className="hidden items-center gap-5 text-sm font-semibold text-[#09213f] lg:flex"
          >
            <Link
              href={`/${locale}/trainers`}
              className="py-3 hover:text-blue-700"
            >
              {locale === "ja" ? "トレーナーを探す" : "Find a trainer"}
            </Link>
            <Link
              href={`/${locale}#how-it-works`}
              className="py-3 hover:text-blue-700"
            >
              {locale === "ja" ? "ご利用の流れ" : "How it works"}
            </Link>
            <Link
              href={`/${locale}/onboarding`}
              className="py-3 hover:text-blue-700"
            >
              {locale === "ja" ? "トレーナーの方へ" : "For trainers"}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            {userId ? (
              <>
                <Link
                  href={`/${locale}/dashboard`}
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} hidden sm:inline-flex`}
                >
                  {copy.dashboard}
                </Link>
                <Link
                  href={`/${locale}/dashboard/workspace?tab=notifications`}
                  aria-label={locale === "ja" ? "通知" : "Notifications"}
                  className="hidden size-11 place-items-center rounded-xl sm:grid text-slate-600 hover:bg-blue-50"
                >
                  <Bell className="size-5" aria-hidden="true" />
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton
                  mode="modal"
                  forceRedirectUrl={`/${locale}/dashboard`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    {copy.signIn}
                  </Button>
                </SignInButton>
                <SignUpButton
                  mode="modal"
                  forceRedirectUrl={`/${locale}/onboarding`}
                >
                  <Button
                    size="sm"
                    className="hidden bg-blue-700 px-5 hover:bg-blue-800 sm:inline-flex"
                  >
                    {copy.signUp}
                  </Button>
                </SignUpButton>
              </>
            )}
            <MobileNavigation locale={locale} signedIn={Boolean(userId)} />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 sm:py-10 lg:px-8"
      >
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">
          <p className="font-bold text-slate-800">Fight Hub</p>
          <div className="flex flex-wrap gap-6">
            <Link className="py-2 hover:underline" href={`/${locale}/trainers`}>
              {locale === "ja" ? "トレーナーを探す" : "Find a trainer"}
            </Link>
            <Link
              className="py-2 hover:underline"
              href={`/${locale}/dashboard/workspace?tab=support`}
            >
              {locale === "ja" ? "お問い合わせ" : "Support"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
