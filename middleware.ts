import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { defaultLocale, locales } from "@/lib/constants/locales";

const isProtectedRoute = createRouteMatcher([
  "/:locale/dashboard(.*)",
  "/:locale/onboarding(.*)",
]);

const isAuthRoute = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
]);

function getLocaleFromPath(pathname: string) {
  const [, candidate] = pathname.split("/");
  return locales.includes(candidate as (typeof locales)[number])
    ? (candidate as (typeof locales)[number])
    : null;
}

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

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (isAuthRoute(req)) {
    const { userId } = await auth();

    if (userId) {
      const locale = getLocaleFromPath(pathname) ?? defaultLocale;
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/"],
};
