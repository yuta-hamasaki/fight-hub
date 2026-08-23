import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { ensureDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { exchangeAndVerifyLineCode } from "@/lib/line/auth";
import { connectLine } from "@/lib/line/connections";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const saved = cookieStore.get("line_oauth_state")?.value;
  cookieStore.delete("line_oauth_state");
  const [expectedState, savedLocale = "en"] = saved?.split(":") ?? [];
  const locale = (savedLocale === "ja" ? "ja" : "en") as Locale;
  const destination = new URL(`/${locale}/dashboard/client`, url.origin);

  const { userId } = await auth();
  const code = url.searchParams.get("code");
  if (!userId || !code || !expectedState || url.searchParams.get("state") !== expectedState) {
    destination.searchParams.set("line", "error");
    return Response.redirect(destination);
  }
  try {
    const user = await ensureDbUser(userId);
    const identity = await exchangeAndVerifyLineCode(code, `${url.origin}/api/line/callback`);
    await connectLine(user.id, identity.lineUserId, identity.friendStatus);
    destination.pathname = `/${locale}/dashboard/${user.role === "TRAINER" ? "trainer" : "client"}`;
    destination.searchParams.set("line", "connected");
  } catch {
    destination.searchParams.set("line", "error");
  }
  return Response.redirect(destination);
}
