# Stripe Connect onboarding (Phase 8 MVP)

This project now supports trainer Stripe Connect onboarding with Express accounts.

## Environment variables

Add these to `.env`:

- `STRIPE_SECRET_KEY` — Stripe secret key from your platform account.
- `NEXT_PUBLIC_APP_URL` — app base URL used for onboarding return/refresh URLs.
- `STRIPE_CONNECT_WEBHOOK_SECRET` — endpoint signing secret for `/api/stripe/webhook`.

## Manual Stripe Dashboard setup

1. Open **Stripe Dashboard → Connect → Settings** and enable Connect for your platform.
2. In **Connect → Onboarding options**, keep Express onboarding defaults for MVP.
3. Go to **Developers → Webhooks** and create an endpoint pointing to:
   - Local: `http://localhost:3000/api/stripe/webhook`
   - Production: `https://<your-domain>/api/stripe/webhook`
4. Subscribe to event: `account.updated`.
5. Copy the webhook signing secret and save it in `STRIPE_CONNECT_WEBHOOK_SECRET`.

## Webhook behavior

Route: `POST /api/stripe/webhook`

- Verifies Stripe signature from `stripe-signature` header.
- Handles `account.updated`.
- Syncs onboarding state into `StripeAccount` table:
  - `detailsSubmitted`
  - `chargesEnabled`
  - `payoutsEnabled`

This keeps trainer onboarding status fresh even if changes happen directly in Stripe dashboard.

## Trainer flow

1. Trainer opens dashboard and clicks **Start Stripe onboarding**.
2. App creates a Stripe Express account if needed and stores it in DB.
3. App redirects to Stripe onboarding link.
4. Trainer returns to dashboard and can click **Refresh Stripe status**.
5. Monetization remains blocked until all are true:
   - details submitted
   - charges enabled
   - payouts enabled

## Platform fee policy (prepared)

`src/lib/billing/fees.ts` contains:

- `PLATFORM_FEE_BPS = 600` (6%)
- `calculatePlatformFeeAmount(amountInMinorUnits)`

Use this helper when creating future Stripe Checkout Sessions or PaymentIntents by setting `application_fee_amount`.
