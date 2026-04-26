import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
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
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-lg font-semibold">{copy.appName}</p>
            <p className="text-sm text-muted-foreground">{copy.tagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {userId ? (
              <>
                <Link href={`/${locale}/trainers`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {copy.trainers}
                </Link>
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
                <Link href={`/${locale}/trainers`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {copy.trainers}
                </Link>
                <SignInButton mode="modal" forceRedirectUrl={`/${locale}/dashboard`}>
                  <Button variant="outline" size="sm">
                    {copy.signIn}
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl={`/${locale}/onboarding`}>
                  <Button size="sm">{copy.signUp}</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
