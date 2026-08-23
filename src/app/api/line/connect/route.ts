import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { locales, type Locale } from "@/lib/constants/locales";
import { getLineConfig } from "@/lib/line/config";

export async function GET(request: Request) {
  const { userId } = await auth();
  const url = new URL(request.url);
  const candidate = url.searchParams.get("locale") ?? "en";
  const locale: Locale = locales.includes(candidate as Locale) ? (candidate as Locale) : "en";
  if (!userId) return Response.redirect(new URL(`/${locale}/sign-in`, url.origin));

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("line_oauth_state", `${state}:${locale}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/line/callback",
  });
  const redirectUri = `${url.origin}/api/line/callback`;
  const authorization = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorization.search = new URLSearchParams({
    response_type: "code",
    client_id: getLineConfig().channelId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile",
    bot_prompt: "aggressive",
  }).toString();
  return Response.redirect(authorization);
}
