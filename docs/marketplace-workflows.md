# Marketplace workflows

## Entry points

- `/{locale}/dashboard/workspace`: bookings, messages, coaching, notifications, memberships, passes, favorites, trainer settings, reviews, analytics, and support.
- `/{locale}/dashboard/bookings/{bookingId}`: joining instructions, feedback, messages, rescheduling, cancellation/refund status, and support for one booking. Only its client and trainer can access it.
- `/{locale}/dashboard/trainer/revenue`: payment ledger (including recurring invoices and refunds), historical Stripe synchronization, and payouts.
- Trainer profiles expose inquiries, favorites, packages, cancellation terms, and available appointment times. Search supports language, format, region, price, and available date.
- Administrators enter the support workspace through the dashboard. An `ADMIN` role must be assigned through an authorized administrative process; clients cannot self-promote.

## Booking rules

Trainers configure weekly hours in an IANA time zone (for example `Asia/Tokyo`), additional openings, closures, lead time, buffer time, and free cancellation deadline. A day with no weekly hours or additional opening is closed. Closures take precedence over openings and never cancel an existing booking automatically.

New reservations snapshot their cancellation deadline and joining instructions. Later changes to an offering or trainer policy do not silently change existing reservations. Clients see times in their configured or booking time zone. Weekly credit reservations retain the same local wall-clock time across daylight-saving changes. Available starts are offered at 15-minute intervals, up to 180 days ahead.

A PostgreSQL transaction advisory lock serializes reservations per trainer and client. Every requested weekly occurrence must be available, conflict-free for the client, before pass expiry, and covered by remaining credits. The series is created atomically. Each occurrence is independently changeable/cancelable.

Paid bookings remain `PENDING` until Stripe confirms payment. Only confirmed sessions that have ended can become `COMPLETED` or `NO_SHOW`. Reviews require a completed session. A trial can be reserved once per client/trainer; a canceled trial does not consume eligibility.

Rescheduling is a proposal until the other participant accepts. The original slot remains reserved. Acceptance rechecks availability and conflicts, and stale proposals cannot be accepted. A rejected proposal leaves the original booking unchanged.

Clients receive full refunds/credit returns before the snapshotted cutoff, and no refund/credit return afterward. Trainer cancellations return the credit or refund the full amount. Refunds reverse the destination transfer and platform fee. Refund API errors are recorded for retry; a late payment after cancellation is refunded without reopening the canceled reservation. Stripe processing fees and unusual disputes still need operational handling in Stripe.

Passes are prepaid credits for a specific session offering. They expire after the trainer-configured number of days from purchase and can only reserve sessions before expiry. Package refund requests are handled through support, not an automatic unused-credit refund policy.

## Payments and notifications

Amounts are stored in major currency units and converted to Stripe units per currency. JPY is zero-decimal. New Stripe sessions are restricted to cards so the synchronous booking hold lifecycle does not imply support for delayed payment methods.

Subscription checkouts reuse a persisted checkout generation and Stripe idempotency key, reject existing active/past-due contracts, and reuse a customer. Each legacy subscription retains its own billing-portal link. Current subscription state is retrieved when webhooks arrive so out-of-order events do not reactivate a canceled contract. Every paid invoice is recorded by its unique Stripe invoice ID.

The revenue screen groups currencies separately and labels net figures as estimates excluding Stripe processing fees and adjustments. Use **Sync historical payments and memberships** once after upgrading to import old session payments and recurring invoices. The operation only reads Stripe and writes the ledger; it never charges or refunds customers. Historical payments cannot be reconstructed accurately from the old plan price alone.

Notifications are currently **in-app only**. LINE OAuth routes and delivery are disabled, including when credentials are configured. There is no application email-notification sender. Stripe/Clerk-managed account or billing emails remain subject to those providers' settings. See [LINE release status](line-integration.md).

## Deployment checklist

1. Use the checked-in Prisma migrations. Test them on a branch before deploying. `prisma.config.ts` loads `.env.local` before `.env`, respects injected environment variables, and prefers `DATABASE_URL_UNPOOLED` for migrations.
2. Run `npm run prisma:deploy` against the intended deployment database and `npm run build`. Check the target before applying migrations: local `.env.local` overrides may point to a separate development branch. Verification for these release-readiness changes used a disposable local database; no production database was migrated.
3. Register these events on the platform `/api/stripe/webhook` endpoint:
   - `checkout.session.completed`, `checkout.session.expired`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `invoice.paid`, `invoice.payment_failed`
   - `charge.refunded`, `refund.created`, `refund.updated`, `refund.failed`
4. Keep the separate Connect webhook configuration. Configure the Stripe billing portal to permit the intended cancellation/payment-method operations.
5. Set `NEXT_PUBLIC_APP_URL` to the actual application origin. Set `CRON_SECRET`. Configure a scheduler to request `GET /api/cron/booking-reminders` with `Authorization: Bearer <CRON_SECRET>` every 15 minutes. `npm run maintenance` is a provider-independent runner for this endpoint. The endpoint reconciles abandoned checkout holds, retries refunds, and sends 24-hour reminders. Cron deployment is an external hosting configuration, not something starting `next dev` schedules automatically.
6. Set `SUPPORT_EMAIL` to an actual monitored address. Verify the public `/{locale}/support` page without signing in, including from the suspended-account page. Do not advertise LINE delivery while it is disabled.
7. Review existing weekly hours and publish the intended local-time availability. Previously unrestricted days are now closed.
8. Run a real Stripe **test-mode** checkout, cancellation/refund, billing-portal flow, and in-app notification delivery against the deployed test endpoint before enabling live charges. Complete [the release checklist](release-checklist.md), including production configuration validation and monitoring.

The maintenance endpoint returns HTTP 503 when a reconciliation, refund retry, or reminder fails, while still attempting independent jobs. Successful responses are `{ processed, reconciled, failed: 0 }`. Configure the scheduler/monitor to alert on non-2xx responses and missing executions; this repository does not provision external monitoring or a scheduler automatically. A successful format check does not verify that provider credentials work.

`User.isActive = false` blocks authenticated application pages/actions and new reservations/subscriptions, and hides a trainer's public profile and availability. Webhooks and maintenance keep processing existing financial obligations. Suspension does **not** automatically cancel existing bookings or recurring subscriptions; operators must handle these through Stripe and support. Public support remains accessible.

## Verification

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Unit and authorization tests run without database mutations. Database integration tests are skipped unless `TEST_DATABASE_URL` is set **and exactly equals** `DATABASE_URL`. Only use an isolated database branch. For example, put both keys in a private environment file and run:

```sh
DOTENV_CONFIG_PATH=/path/to/isolated-test.env npm test
```

The integration suite uses unique fixtures, cleans up its own data, and mocks Stripe/LINE. It covers simultaneous reservations, closures, ownership, weekly-credit atomicity, late cancellations, late-payment refunds, trial eligibility, recurring-invoice idempotency, duplicate subscription checkout attempts, two-party rescheduling, and accepting a proposal after a competing booking. It does not exercise a real card payment or LINE account.

HTTP smoke checks against a running development server:

```sh
SMOKE_BASE_URL=http://localhost:3100 node scripts/smoke-marketplace.mjs
```

These check the public Japanese/English directory and profile, API validation, signed-out dashboard protection, private rescheduling access, and webhook/cron authentication without sending messages or creating payments.

Stripe currency and refund integration follows the official [currency units](https://docs.stripe.com/currencies) and [refund API](https://docs.stripe.com/api/refunds/create) references.
