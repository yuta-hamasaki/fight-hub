# Martial Arts Trainer Marketplace MVP — Architecture & Delivery Plan

## 1) MVP Architecture Plan

### Product approach (MVP-first)
- Focus only on validating supply/demand flow:
  1. Client discovers trainer.
  2. Client books a session or buys a subscription.
  3. Trainer fulfills service and receives payout through Stripe Connect.
- Keep data model minimal but extensible (additive columns/tables later, no heavy polymorphism now).
- Defer non-MVP intelligence features (AI generation, ranking, churn, campaigns) while leaving schema hooks for future expansion.

### High-level system design
- **Frontend:** Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui.
- **Auth:** Clerk for sign-in/up and role-bound onboarding.
- **Database:** PostgreSQL (Neon) via Prisma ORM.
- **Payments:** Stripe Connect Standard (trainer payouts) + Stripe Checkout/PaymentIntents for purchases.
- **Content:** DB records for premium posts (text + private YouTube links).
- **Bilingual:** Core route groups and dictionaries for English/Japanese from day one.

### Runtime architecture
- Prefer **Server Components** for pages, data fetching, and secure role checks.
- Use **Client Components** for interactive UI only:
  - filters
  - booking forms
  - payment confirmation UX
  - dashboard tables/actions
- Use **Server Actions** or route handlers for mutations.
- Keep side effects centralized in service modules (`/lib/services/*`).

### Security & access model
- Authentication via Clerk middleware.
- Authorization at server boundary using role checks (`client`, `trainer`, `admin` optional later).
- Stripe webhooks validated server-side; payment status is source-of-truth from Stripe events.
- Premium content access gated by active subscription ownership.

### i18n strategy (mandatory EN/JA)
- Use locale segment in routes: `/(public)/[locale]/...` and `/(app)/[locale]/...`.
- Dictionary-based translation modules (`/i18n/en.ts`, `/i18n/ja.ts`) for MVP.
- Persist user locale preference in DB profile + cookie fallback.

### UI/UX baseline
- White-based clean UI with blue accents.
- Responsive layouts (mobile-first).
- Loading/skeleton states for all async user-triggered operations.
- Minimal design system primitives via shadcn/ui.

---

## 2) Recommended Folder Structure

```txt
/app
  /(marketing)
    [locale]/
      page.tsx                      # Landing
      trainers/
        page.tsx                    # Browse + filters
      trainers/[slug]/
        page.tsx                    # Public trainer profile

  /(client)
    [locale]/
      client/
        dashboard/page.tsx
        bookings/page.tsx
        subscriptions/page.tsx
        checkout/
          session/[offeringId]/page.tsx
          plan/[planId]/page.tsx

  /(trainer)
    [locale]/
      trainer/
        onboarding/page.tsx
        profile/page.tsx
        offerings/page.tsx
        plans/page.tsx
        content/page.tsx
        bookings/page.tsx
        earnings/page.tsx
        stripe-connect/page.tsx

  /api
    stripe/webhook/route.ts
    bookings/route.ts
    subscriptions/route.ts
    trainer/profile/route.ts

/components
  /common
  /layout
  /trainer
  /client
  /forms

/lib
  /auth
    roles.ts
  /db
    prisma.ts
  /stripe
    client.ts
    connect.ts
    webhook.ts
  /services
    trainer.service.ts
    booking.service.ts
    subscription.service.ts
    content.service.ts
  /validators
    booking.ts
    trainer.ts
    plan.ts
  /utils

/i18n
  en.ts
  ja.ts
  config.ts

/prisma
  schema.prisma

/types
  domain.ts

/middleware.ts
```

Notes:
- Route groups keep public/client/trainer concerns isolated.
- Locale is explicit in path for SEO and predictable bilingual rendering.
- Service layer prevents route-handler business logic duplication.

---

## 3) Route Map (MVP)

### Public routes
- `/{locale}` — landing page.
- `/{locale}/trainers` — browse trainers + category filters.
- `/{locale}/trainers/{slug}` — trainer profile with offerings/plans.

### Auth/onboarding routes
- Clerk hosted or embedded auth pages.
- `/{locale}/trainer/onboarding` — role setup and initial trainer profile.

### Client app routes
- `/{locale}/client/dashboard`
- `/{locale}/client/bookings`
- `/{locale}/client/subscriptions`
- `/{locale}/client/checkout/session/{offeringId}`
- `/{locale}/client/checkout/plan/{planId}`

### Trainer app routes
- `/{locale}/trainer/profile`
- `/{locale}/trainer/stripe-connect`
- `/{locale}/trainer/offerings`
- `/{locale}/trainer/plans`
- `/{locale}/trainer/content`
- `/{locale}/trainer/bookings`
- `/{locale}/trainer/earnings`

### API routes / webhooks
- `POST /api/stripe/webhook` — payment + connect events.
- `POST /api/bookings` — create booking intent.
- `POST /api/subscriptions` — create subscription checkout.
- `PATCH /api/trainer/profile` — trainer profile updates.

---

## 4) Prisma Schema Design (MVP)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CLIENT
  TRAINER
  ADMIN
}

enum MartialArtCategory {
  MMA
  KICKBOXING
  BRAZILIAN_JIU_JITSU
  BOXING
  PRO_WRESTLING
  WRESTLING
  WEIGHT_TRAINING
  BODYWEIGHT_TRAINING
  OTHER
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELED
  REFUNDED
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  INCOMPLETE
  EXPIRED
}

enum ContentType {
  YOUTUBE_PRIVATE_LINK
  TEXT_POST
}

model User {
  id                 String    @id @default(cuid())
  clerkUserId        String    @unique
  email              String    @unique
  role               UserRole  @default(CLIENT)
  displayName        String?
  locale             String    @default("en") // "en" | "ja"
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  trainerProfile     TrainerProfile?
  clientBookings     Booking[]          @relation("ClientBookings")
  clientSubscriptions TrainerSubscription[]
}

model TrainerProfile {
  id                   String   @id @default(cuid())
  userId               String   @unique
  slug                 String   @unique
  bioEn                String?
  bioJa                String?
  headlineEn           String?
  headlineJa           String?
  yearsExperience      Int?
  isPublished          Boolean  @default(false)
  stripeAccountId      String?
  stripeChargesEnabled Boolean  @default(false)
  stripePayoutsEnabled Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user            User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  categories      TrainerCategory[]
  offerings       SessionOffering[]
  plans           SubscriptionPlan[]
  bookings        Booking[]
  premiumContents PremiumContent[]
}

model TrainerCategory {
  id          String              @id @default(cuid())
  trainerId   String
  category    MartialArtCategory

  trainer TrainerProfile @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  @@unique([trainerId, category])
  @@index([category])
}

model SessionOffering {
  id                 String   @id @default(cuid())
  trainerId          String
  titleEn            String
  titleJa            String
  descriptionEn      String?
  descriptionJa      String?
  durationMinutes    Int
  priceCents         Int
  currency           String   @default("usd")
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  trainer   TrainerProfile @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  bookings  Booking[]

  @@index([trainerId, isActive])
}

model Booking {
  id                     String        @id @default(cuid())
  clientId               String
  trainerId              String
  offeringId             String
  status                 BookingStatus @default(PENDING)
  scheduledAt            DateTime
  notes                  String?

  // Stripe payment tracking
  stripePaymentIntentId  String?       @unique
  amountSubtotalCents    Int
  platformFeeCents       Int
  trainerPayoutCents     Int
  currency               String        @default("usd")

  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  client   User            @relation("ClientBookings", fields: [clientId], references: [id], onDelete: Cascade)
  trainer  TrainerProfile  @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  offering SessionOffering @relation(fields: [offeringId], references: [id], onDelete: Restrict)

  @@index([clientId, createdAt])
  @@index([trainerId, scheduledAt])
}

model SubscriptionPlan {
  id                     String   @id @default(cuid())
  trainerId              String
  nameEn                 String
  nameJa                 String
  descriptionEn          String?
  descriptionJa          String?
  priceCents             Int
  currency               String   @default("usd")
  interval               String   // "month" MVP, extensible
  isActive               Boolean  @default(true)

  stripeProductId        String?
  stripePriceId          String?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  trainer       TrainerProfile         @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  subscriptions TrainerSubscription[]

  @@index([trainerId, isActive])
}

model TrainerSubscription {
  id                    String             @id @default(cuid())
  clientId              String
  trainerId             String
  planId                String
  status                SubscriptionStatus @default(INCOMPLETE)

  stripeSubscriptionId  String?            @unique
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean            @default(false)

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  client  User            @relation(fields: [clientId], references: [id], onDelete: Cascade)
  trainer TrainerProfile  @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  plan    SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Restrict)

  @@index([clientId, status])
  @@index([trainerId, status])
}

model PremiumContent {
  id              String      @id @default(cuid())
  trainerId       String
  type            ContentType
  titleEn         String
  titleJa         String
  bodyEn          String?
  bodyJa          String?
  youtubeUrl      String?
  isPublished     Boolean     @default(false)
  publishedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  trainer TrainerProfile @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  @@index([trainerId, isPublished, publishedAt])
}
```

### Fee model (8% platform fee)
- Store fee values per transaction in `Booking`.
- Calculation on booking creation:
  - `platformFeeCents = floor(amountSubtotalCents * 0.08)`
  - `trainerPayoutCents = amountSubtotalCents - platformFeeCents`
- Persisting denormalized amounts protects reporting from future fee changes.

---

## 5) Phased Implementation Plan

### Phase 0 — Foundation setup
**Goal:** Initialize stack and guardrails.
- Next.js app bootstrap with App Router, Tailwind, shadcn.
- Prisma + Neon connection.
- Clerk auth + role metadata strategy.
- i18n locale routing and dictionaries.
- Base layout, design tokens, loading UI primitives.

### Phase 1 — Public discovery + trainer profiles
**Goal:** Validate client interest and trainer discoverability.
- Trainer profile CRUD (trainer side).
- Publish/unpublish trainer profile.
- Public trainer listing + category filters.
- Public profile page with offerings/plans preview.

### Phase 2 — Session booking payments
**Goal:** Validate one-time booking transactions.
- Session offering CRUD (trainer side).
- Client booking flow with Stripe Checkout/PI.
- Booking status lifecycle + trainer/client booking lists.
- Stripe webhook handling and idempotency.

### Phase 3 — Subscription plans + premium content
**Goal:** Validate recurring revenue.
- Trainer subscription plan CRUD.
- Client subscription purchase flow.
- Trainer premium content CRUD.
- Access gating of premium content by active subscription.

### Phase 4 — Trainer operations dashboard
**Goal:** Validate trainer retention and operability.
- Stripe Connect onboarding state + reconnect flow.
- Trainer booking management UI.
- Basic earnings dashboard (gross, fee, net, recent payouts approximation).

### Phase 5 — MVP hardening & launch readiness
**Goal:** Ship stable beta.
- Error states + retries + empty states.
- Basic audit logs (optional minimal table).
- QA pass for EN/JA parity.
- Seed data and smoke tests.
- Minimal analytics events (page view, booking started, checkout success).

---

## Required Environment Variables (for implementation phases)

```bash
# Database
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Platform
PLATFORM_FEE_PERCENT=8
NEXT_PUBLIC_APP_URL=
```

---

## Manual Setup Steps (when implementation starts)
1. Create Neon project and set `DATABASE_URL`.
2. Create Clerk app with required redirect URLs and user metadata/role strategy.
3. Create Stripe platform account and enable Connect.
4. Configure Stripe webhook endpoint: `/api/stripe/webhook`.
5. Run Prisma migrations and seed base categories (if needed).
6. Verify bilingual routing (`/en`, `/ja`) and locale switching.

---

## Future Extensibility Notes (non-MVP features)
- AI profile generation/taglines: add `aiGenerated` metadata tables later.
- Rankings: add materialized metrics table and scoring jobs.
- Advanced analytics: add event table + warehouse pipeline.
- Coupons/campaigns: separate pricing rules engine to avoid contaminating core booking tables.
- Internal chat: isolate into messaging bounded context.
