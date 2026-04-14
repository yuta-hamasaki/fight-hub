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
    <div className="flex items-center gap-2">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={getLocalizedPath(pathname, locale)}
          prefetch={false}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
