"use server";

import { redirect } from "next/navigation";

import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import { createStripeConnectedAccount, createStripeConnectOnboardingLink, retrieveStripeConnectedAccount } from "@/lib/stripe";

function isOnboardingComplete(status: { detailsSubmitted: boolean; chargesEnabled: boolean; payoutsEnabled: boolean }) {
  return status.detailsSubmitted && status.chargesEnabled && status.payoutsEnabled;
}

export async function syncStripeAccountForCurrentTrainer(locale: Locale) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const existing = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });
  if (!existing) {
    return null;
  }

  const account = await retrieveStripeConnectedAccount(existing.stripeAccountId);
  const completed = isOnboardingComplete({
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });

  return prisma.stripeAccount.update({
    where: { userId: user.id },
    data: {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingStatus: completed ? "COMPLETED" : "PENDING",
    },
  });
}

export async function startStripeRegistration(locale: Locale) {
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  let stripeAccount = await prisma.stripeAccount.findUnique({ where: { userId: user.id } });

  if (!stripeAccount) {
    const account = await createStripeConnectedAccount(user.email);
    stripeAccount = await prisma.stripeAccount.create({
      data: {
        userId: user.id,
        stripeAccountId: account.id,
        onboardingStatus: "PENDING",
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
    });
  }

  const accountLink = await createStripeConnectOnboardingLink({
    stripeAccountId: stripeAccount.stripeAccountId,
    locale,
  });

  await prisma.stripeAccount.update({
    where: { userId: user.id },
    data: { onboardingStatus: "PENDING" },
  });

  redirect(accountLink.url);
}
