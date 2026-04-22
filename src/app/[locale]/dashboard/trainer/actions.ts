"use server";

import { redirect } from "next/navigation";

import {
  createOrFetchStripeConnectedAccount,
  createStripeOnboardingLink,
  syncStripeAccountState,
} from "@/lib/stripe/connect";

type StartTrainerStripeOnboardingArgs = {
  locale: string;
  userId: string;
  email: string | null;
};

export async function startTrainerStripeOnboarding({
  locale,
  userId,
  email,
}: StartTrainerStripeOnboardingArgs) {
  const stripeAccount = await createOrFetchStripeConnectedAccount(userId, email);
  const onboardingLink = await createStripeOnboardingLink(stripeAccount.stripeAccountId, locale);

  redirect(onboardingLink.url);
}

export async function refreshTrainerStripeStatus(stripeAccountId: string | null) {
  if (!stripeAccountId) {
    return;
  }

  await syncStripeAccountState(stripeAccountId);
}
