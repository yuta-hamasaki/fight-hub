import type { MetadataRoute } from "next";
import { locales } from "@/lib/constants/locales";

// Public entry points. Trainer profile URLs are discoverable in the directory.
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return ["", "/trainers", "/support"].flatMap((path) =>
    locales.map((locale) => ({
      url: new URL(`/${locale}${path}`, origin).href,
      alternates: {
        languages: Object.fromEntries(
          locales.map((language) => [
            language,
            new URL(`/${language}${path}`, origin).href,
          ]),
        ),
      },
    })),
  );
}
