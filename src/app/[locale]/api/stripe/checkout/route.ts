import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/stripe";
import { beginSubscription } from "@/lib/marketplace/subscription-checkout";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  return NextResponse.redirect(new URL(`/${locale}/trainers`, request.url));
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params,
    base = getAppBaseUrl();
  if (
    !["ja", "en"].includes(locale) ||
    request.headers.get("origin") !== new URL(base).origin
  )
    return new Response("Forbidden", { status: 403 });
  const { userId } = await auth();
  if (!userId)
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, base), 303);
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user || user.role !== "CLIENT")
    return new Response("Forbidden", { status: 403 });
  try {
    const f = await request.formData();
    return NextResponse.redirect(
      await beginSubscription(user.id, String(f.get("planId") || ""), locale),
      303,
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard/workspace?tab=billing&error=1`, base),
      303,
    );
  }
}
