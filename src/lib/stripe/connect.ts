import Stripe from "stripe";

import { prisma } from "@/lib/prisma";

export type StripeOnboardingStatus = {
  hasAccount: boolean;
  stripeAccountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
};

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"));
  }

  return stripeClient;
}

export function isStripeOnboardingComplete(status: {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}) {
  return status.detailsSubmitted && status.chargesEnabled && status.payoutsEnabled;
}

export async function getTrainerStripeOnboardingStatus(userId: string): Promise<StripeOnboardingStatus> {
  const account = await prisma.stripeAccount.findUnique({
    where: { userId },
    select: {
      stripeAccountId: true,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    },
  });

  if (!account) {
    return {
      hasAccount: false,
      stripeAccountId: null,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingComplete: false,
    };
  }

  return {
    hasAccount: true,
    stripeAccountId: account.stripeAccountId,
    detailsSubmitted: account.detailsSubmitted,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    onboardingComplete: isStripeOnboardingComplete(account),
  };
}

export async function createOrFetchStripeConnectedAccount(userId: string, email: string | null) {
  const existing = await prisma.stripeAccount.findUnique({ where: { userId } });

  if (existing) {
    return existing;
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    email: email ?? undefined,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  });

  return prisma.stripeAccount.create({
    data: {
      userId,
      stripeAccountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    },
  });
}

export async function syncStripeAccountState(stripeAccountId: string) {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return prisma.stripeAccount.update({
    where: { stripeAccountId },
    data: {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    },
  });
}

export async function createStripeOnboardingLink(stripeAccountId: string, locale: string) {
  const stripe = getStripeClient();
  const appBaseUrl = requireEnv(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL");

  return stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${appBaseUrl}/${locale}/dashboard/trainer?stripe=refresh`,
    return_url: `${appBaseUrl}/${locale}/dashboard/trainer?stripe=return`,
  });
}
