"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, getStripeClient } from "@/lib/stripe";

export async function cancelBooking(locale: Locale, formData: FormData) {
  const user = await requireDbUser(locale);
  const bookingId = String(formData.get("bookingId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clientId: user.id, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  if (!booking || booking.startsAt <= new Date()) return;

  if (booking.stripePaymentIntentId) {
    await getStripeClient().refunds.create({ payment_intent: booking.stripePaymentIntentId });
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELED", canceledAt: new Date(), cancellationReason: reason || null },
  });
  revalidatePath(`/${locale}/dashboard/client`);
  revalidatePath(`/${locale}/dashboard/trainer`);
}

export async function openBillingPortal(locale: Locale) {
  const user = await requireDbUser(locale);
  const purchase = await prisma.subscriptionPurchase.findFirst({
    where: { userId: user.id, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { stripeCustomerId: true },
  });
  if (!purchase?.stripeCustomerId) return;
  const portal = await getStripeClient().billingPortal.sessions.create({
    customer: purchase.stripeCustomerId,
    return_url: `${getAppBaseUrl()}/${locale}/dashboard/client`,
  });
  redirect(portal.url);
}
