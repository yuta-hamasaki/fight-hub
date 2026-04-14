import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { defaultLocale, locales } from "@/lib/constants/locales";

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}`;
    return NextResponse.redirect(url);
  }

  const isLocalizedPath = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!isLocalizedPath && !pathname.startsWith("/_next") && !pathname.includes(".")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  await auth();

  return NextResponse.next();
});

export const config = {
  matcher: ["/(.*)"],
};
