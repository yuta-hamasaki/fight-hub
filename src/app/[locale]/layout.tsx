import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { defaultLocale, locales, type Locale } from "@/lib/constants/locales";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return <AppShell locale={(locale as Locale) || defaultLocale}>{children}</AppShell>;
}
