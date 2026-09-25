"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { defaultLocale, locales, type Locale } from "@/lib/constants/locales";

function getLocalizedPath(pathname: string, targetLocale: Locale) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return `/${targetLocale}`;
  }

  if (locales.includes(segments[0] as Locale)) {
    segments[0] = targetLocale;
    return `/${segments.join("/")}`;
  }

  return `/${targetLocale}/${segments.join("/")}`;
}

export function LanguageSwitcher() {
  const pathname = usePathname() || `/${defaultLocale}`;

  return (
    <div aria-label="Language" className="flex items-center gap-1">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={getLocalizedPath(pathname, locale)}
          prefetch={false}
          aria-label={locale === "ja" ? "日本語" : "English"}
          aria-current={pathname.split("/")[1] === locale ? "true" : undefined}
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} px-2 ${pathname.split("/")[1] === locale ? "bg-blue-50 text-blue-800" : "text-slate-500"}`}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
