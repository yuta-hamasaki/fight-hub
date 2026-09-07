import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";

export async function AppShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const copy = dictionary[locale];
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative z-50 border-b border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2 text-xl font-black tracking-tight text-[#09213f]">
            <span className="grid size-9 place-items-center -skew-x-12 rounded-md bg-blue-700 text-white"><Dumbbell className="size-5 skew-x-12" /></span>
            {copy.appName}
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#09213f] lg:flex">
            <Link href={`/${locale}/trainers`}>探す</Link><Link href={`/${locale}/trainers`}>カテゴリ</Link><Link href={`/${locale}#how-it-works`}>はじめての方へ</Link><Link href={`/${locale}/onboarding`}>トレーナーの方へ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {userId ? (
              <>
                <Link
                  href={`/${locale}/dashboard`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {copy.dashboard}
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal" forceRedirectUrl={`/${locale}/dashboard`}>
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                    {copy.signIn}
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl={`/${locale}/onboarding`}>
                  <Button size="sm" className="bg-blue-700 px-5 hover:bg-blue-800">{copy.signUp}</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
