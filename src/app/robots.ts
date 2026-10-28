import type { MetadataRoute } from "next";
import { locales } from "@/lib/constants/locales";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...locales.flatMap((locale) =>
          [
            "/api/",
            "/dashboard",
            "/trainer/dashboard",
            "/onboarding",
            "/account-suspended",
            "/sign-in",
            "/sign-up",
          ].map((path) => `/${locale}${path}`),
        ),
      ],
    },
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}
