import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/constants/locales";

export function AppShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const copy = dictionary[locale];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-semibold">{copy.appName}</p>
            <p className="text-sm text-muted-foreground">{copy.tagline}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
