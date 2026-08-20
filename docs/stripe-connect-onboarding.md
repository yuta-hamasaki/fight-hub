# Stripe Connect onboarding and payouts

This project now supports trainer Stripe Connect onboarding with Express accounts.

## Environment variables

Add these to `.env`:

- `STRIPE_SECRET_KEY` — Stripe secret key from your platform account.
- `NEXT_PUBLIC_APP_URL` — app base URL used for onboarding return/refresh URLs.
- `STRIPE_WEBHOOK_SECRET` — signing secret for platform payments at `/api/stripe/webhook`.
- `STRIPE_CONNECT_WEBHOOK_SECRET` — signing secret for connected-account events at `/api/stripe/connect/webhook`.

## Manual Stripe Dashboard setup

1. Open **Stripe Dashboard → Connect → Settings** and enable Connect for your platform.
2. In **Connect → Onboarding options**, keep Express onboarding defaults for MVP.
3. Create a Connect webhook endpoint pointing to:
   - Local: `http://localhost:3000/api/stripe/connect/webhook`
   - Production: `https://<your-domain>/api/stripe/connect/webhook`
4. Subscribe the Connect endpoint to `account.updated`.
5. Copy the webhook signing secret and save it in `STRIPE_CONNECT_WEBHOOK_SECRET`.
6. Create a separate platform webhook at `/api/stripe/webhook` and subscribe it to `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. Store that endpoint's secret in `STRIPE_WEBHOOK_SECRET`.

## Webhook behavior

Route: `POST /api/stripe/connect/webhook`

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

After onboarding is complete, trainers can use **Manage bank account and payouts** on the Stripe settings page. The app creates a short-lived Stripe Express Dashboard login link, where Stripe securely handles bank account, identity, and payout schedule changes. Bank details are never stored by Fight Hub.

## Platform fee policy (prepared)

`src/lib/billing/fees.ts` contains:

- `PLATFORM_FEE_BPS = 600` (6%)
- `calculatePlatformFeeAmount(amountInMinorUnits)`

Session Checkout uses `application_fee_amount`, while subscription Checkout uses the equivalent `application_fee_percent`. The trainer revenue dashboard at `/{locale}/dashboard/trainer/revenue` uses the same fee policy when presenting gross sales, estimated fees, and net revenue. It also reads recent payouts directly from the trainer's connected Stripe account; Stripe remains the source of truth for actual bank deposits.
