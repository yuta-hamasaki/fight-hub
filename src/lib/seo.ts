import type { Metadata } from "next";
import { locales, type Locale } from "@/lib/constants/locales";

export function publicPageMetadata(locale: Locale, path = ""): Metadata {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = (language: Locale) => new URL(`/${language}${path}`, origin).href;
  return {
    alternates: {
      canonical: url(locale),
      languages: Object.fromEntries(
        locales.map((language) => [language, url(language)]),
      ),
    },
    openGraph: {
      url: url(locale),
      siteName: "Fight Hub",
      type: "website",
      locale: locale === "ja" ? "ja_JP" : "en_US",
    },
  };
}
