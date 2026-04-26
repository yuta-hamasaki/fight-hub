import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  }

  const url = new URL(request.url);
  const planId = url.searchParams.get("planId");

  if (!planId) {
    return NextResponse.redirect(new URL(`/${locale}/trainers`, request.url));
  }
  const dbUser = (await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true, email: true },
  })) as { id: string; role: string; email: string | null } | null;

  if (!dbUser || dbUser.role !== "CLIENT") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, isActive: true },
    include: {
      trainerProfile: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  if (!plan) {
    return NextResponse.redirect(new URL(`/${locale}/trainers`, request.url));
  }

  const stripe = getStripeClient();
  const amount = Math.round(Number(plan.priceMonthly) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${url.origin}/${locale}/dashboard/client?purchase=success`,
    cancel_url: `${url.origin}/${locale}/trainers/${plan.trainerProfileId}?purchase=canceled`,
    customer_email: dbUser.email ?? undefined,
    metadata: {
      dbUserId: dbUser.id,
      subscriptionPlanId: plan.id,
      trainerProfileId: plan.trainerProfileId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency.toLowerCase(),
          unit_amount: amount,
          recurring: {
            interval: "month",
          },
          product_data: {
            name: plan.nameEn,
            description: plan.descriptionEn ?? undefined,
          },
        },
      },
    ],
  });

  if (!session.url) {
    return NextResponse.redirect(new URL(`/${locale}/trainers/${plan.trainerProfileId}`, request.url));
  }

  return NextResponse.redirect(session.url);
}
