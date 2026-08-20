# Fight Hub

Fight Hub is a bilingual (`en` / `ja`) marketplace for finding martial-arts and fitness trainers. Clients can book paid sessions, purchase trainer subscriptions, read premium content, and manage trainer reviews. Trainers can publish their profile and services, manage bookings and availability, connect Stripe, and track revenue and payouts.

## Current features

### Clients

- Browse and filter published trainer profiles.
- Book available sessions and pay through Stripe Checkout.
- Purchase monthly subscriptions and access assigned premium content.
- View booking and subscription information from the client dashboard.
- Post, edit, or delete one review per trainer from the trainer detail page.

### Trainers

- Create and publish a bilingual trainer profile.
- Manage session offerings, weekly availability, bookings, and subscription plans.
- Create text or private-YouTube premium content and assign it to plans.
- Complete Stripe Connect Express onboarding and open the Stripe Express dashboard.
- Use the revenue dashboard to review gross sales, the platform fee, estimated net revenue, sales history, and recent Stripe payouts.

### Platform

- Clerk authentication with `CLIENT`, `TRAINER`, and `ADMIN` database roles.
- English and Japanese locale-prefixed routes.
- PostgreSQL persistence through Prisma.
- Idempotent Stripe webhook processing for checkout, subscription, and Connect account events.
- A 6% platform fee applied to session and subscription payments.

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- Clerk
- PostgreSQL and Prisma 7
- Stripe Checkout and Stripe Connect Express
- Vitest and ESLint

## Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database
- A Clerk application
- A Stripe account with Connect enabled

## Environment variables

Create `.env` in the repository root:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_WEBHOOK_SECRET="whsec_..."
```

`STRIPE_WEBHOOK_SECRET` belongs to the platform payment endpoint. `STRIPE_CONNECT_WEBHOOK_SECRET` belongs to the separate Connect endpoint. See [Stripe Connect setup](docs/stripe-connect-onboarding.md) for the event and endpoint configuration.

## Local setup

```bash
npm install
npm run prisma:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to the default locale. Public trainer pages can be browsed without authentication; dashboards and onboarding require sign-in.

`predev` and `prebuild` regenerate Prisma Client automatically. Run `npm run prisma:migrate` after pulling any commit that adds a migration. In production, apply checked-in migrations using the deployment workflow rather than creating a new development migration.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Generate Prisma Client and start the development server. |
| `npm run build` | Generate Prisma Client and create a production build. |
| `npm run start` | Start a completed production build. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run prisma:generate` | Regenerate Prisma Client. |
| `npm run prisma:migrate` | Create/apply a development migration. |
| `npm run prisma:studio` | Open Prisma Studio. |

## Main routes

Replace `{locale}` with `en` or `ja`.

| Route | Access | Description |
| --- | --- | --- |
| `/{locale}/trainers` | Public | Trainer directory. |
| `/{locale}/trainers/{trainerId}` | Public; client actions require sign-in | Trainer profile, purchasing, booking, and reviews. |
| `/{locale}/dashboard/client` | Client | Client bookings, subscriptions, and content access. |
| `/{locale}/dashboard/trainer` | Trainer | Trainer management dashboard. |
| `/{locale}/dashboard/trainer/content` | Trainer | Premium content management. |
| `/{locale}/dashboard/trainer/revenue` | Trainer | Sales, fee, net revenue, and payout reporting. |
| `/{locale}/trainer/dashboard/stripe` | Trainer | Stripe Connect and Express dashboard access. |
| `/api/stripe/webhook` | Stripe | Checkout and subscription events. |
| `/api/stripe/connect/webhook` | Stripe Connect | Connected-account events. |

## Revenue and review behavior

- Each client owns at most one review per trainer. Saving again updates that review; deletion is restricted to its owner.
- Revenue totals include paid completed sessions and recorded initial subscription purchases.
- The displayed platform fee and net revenue are calculated from the current 6% fee policy.
- Payout history is read from the trainer's connected Stripe account. If Stripe is not configured or temporarily unavailable, the rest of the revenue dashboard remains usable.

## Project documentation

- [MVP architecture and implementation notes](docs/mvp-architecture-plan.md)
- [Stripe Connect onboarding and webhook setup](docs/stripe-connect-onboarding.md)
