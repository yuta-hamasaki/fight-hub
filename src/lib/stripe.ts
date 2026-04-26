import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = requireEnv(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
  });

  return stripeClient;
}

export function getAppBaseUrl() {
  return requireEnv(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL");
}

export async function createStripeConnectedAccount(email: string | null) {
  const stripe = getStripeClient();
  return stripe.accounts.create({
    type: "express",
    email: email ?? undefined,
  });
}

export async function retrieveStripeConnectedAccount(stripeAccountId: string) {
  const stripe = getStripeClient();
  return stripe.accounts.retrieve(stripeAccountId);
}

export async function createStripeConnectOnboardingLink({
  stripeAccountId,
  locale,
}: {
  stripeAccountId: string;
  locale: string;
}) {
  const stripe = getStripeClient();
  const appBaseUrl = getAppBaseUrl();

  return stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appBaseUrl}/${locale}/trainer/dashboard/stripe/refresh`,
    return_url: `${appBaseUrl}/${locale}/trainer/dashboard/stripe/return`,
    type: "account_onboarding",
  });
}
