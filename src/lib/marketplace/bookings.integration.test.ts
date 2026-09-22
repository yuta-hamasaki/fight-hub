import {
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
const actor = vi.hoisted(() => ({ id: "", role: "CLIENT" }));
vi.mock("@/lib/auth/session", () => ({ requireDbUser: async () => actor }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
const stripe = vi.hoisted(() => ({
  checkout: {
    sessions: { create: vi.fn(), retrieve: vi.fn(), expire: vi.fn() },
  },
  refunds: { create: vi.fn(), retrieve: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
  invoices: { retrieve: vi.fn() },
  customers: { create: vi.fn() },
}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => stripe,
  getAppBaseUrl: () => "http://localhost:3000",
}));
vi.mock("@/lib/marketplace/notifications", () => ({
  notify: vi.fn(),
  notifyBooking: vi.fn(),
}));
vi.mock("@/lib/notifications/service", () => ({
  notificationService: {
    bookingConfirmed: vi.fn(),
    newTrainerBooking: vi.fn(),
  },
}));
import { mutate } from "@/app/[locale]/dashboard/workspace/actions";
import { availableSlots } from "./schedule";
import { prisma } from "@/lib/prisma";
import { beginSubscription } from "./subscription-checkout";
import { reserveBooking, cancelReservation, refundBooking } from "./bookings";
import {
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
  handleRefundUpdated,
} from "@/lib/stripe/subscription-webhooks";
import type Stripe from "stripe";
const enabled = !!process.env.TEST_DATABASE_URL;
if (enabled && process.env.TEST_DATABASE_URL !== process.env.DATABASE_URL)
  throw new Error(
    "Integration tests require an explicitly isolated DATABASE_URL",
  );
describe.skipIf(!enabled)(
  "booking workflows on an isolated Postgres branch",
  () => {
    let trainer: string,
      client: string,
      other: string,
      offering: string,
      profile: string,
      pass: string;
    const start = () => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 3);
      d.setUTCHours(12, 0, 0, 0);
      return d;
    };
    beforeEach(async () => {
      trainer = "";
      client = "";
      other = "";
      vi.clearAllMocks();
      const prefix = `test-marketplace-${randomUUID()}`;
      trainer = (
        await prisma.user.create({
          data: { clerkUserId: `${prefix}-trainer`, role: "TRAINER" },
        })
      ).id;
      client = (
        await prisma.user.create({
          data: { clerkUserId: `${prefix}-client`, role: "CLIENT" },
        })
      ).id;
      other = (
        await prisma.user.create({
          data: { clerkUserId: `${prefix}-other`, role: "CLIENT" },
        })
      ).id;
      profile = (
        await prisma.trainerProfile.create({
          data: {
            userId: trainer,
            isPublished: true,
            bookingLeadHours: 0,
            bufferMinutes: 15,
            cancellationHours: 24,
          },
        })
      ).id;
      await prisma.stripeAccount.create({
        data: {
          userId: trainer,
          stripeAccountId: `acct_${prefix}`,
          onboardingStatus: "COMPLETED",
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      });
      offering = (
        await prisma.sessionOffering.create({
          data: {
            trainerProfileId: profile,
            trainerUserId: trainer,
            titleEn: "Test session",
            price: 5000,
            durationMinutes: 60,
          },
        })
      ).id;
      await prisma.trainerAvailability.createMany({
        data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          trainerId: trainer,
          dayOfWeek,
          startMinute: 540,
          endMinute: 1080,
          timezone: "UTC",
        })),
      });
      const pack = await prisma.sessionPackage.create({
        data: {
          trainerId: trainer,
          offeringId: offering,
          title: "Test 4-pack",
          credits: 4,
          price: 16000,
        },
      });
      pass = (
        await prisma.passPurchase.create({
          data: {
            userId: client,
            trainerId: trainer,
            offeringId: offering,
            packageId: pack.id,
            title: pack.title,
            credits: 4,
            remaining: 4,
            amount: 16000,
            validityDays: 90,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 90 * 86400000),
          },
        })
      ).id;
      stripe.checkout.sessions.create.mockImplementation(async (args) => ({
        id: `cs_${args.metadata.bookingId}`,
        url: "https://checkout.stripe.com/test",
        metadata: args.metadata,
      }));
      stripe.refunds.create.mockResolvedValue({
        id: `re_${prefix}`,
        status: "succeeded",
        amount: 5000,
      });
    });
    afterEach(async () => {
      if (!trainer) return;
      await prisma.subscriptionPurchase.deleteMany({
        where: { subscriptionPlan: { trainerProfile: { userId: trainer } } },
      });
      await prisma.paymentRecord.deleteMany({ where: { trainerId: trainer } });
      await prisma.booking.deleteMany({ where: { trainerId: trainer } });
      await prisma.passPurchase.deleteMany({ where: { trainerId: trainer } });
      await prisma.sessionPackage.deleteMany({ where: { trainerId: trainer } });
      await prisma.user.deleteMany({
        where: { id: { in: [trainer, client, other] } },
      });
    });
    afterAll(async () => {
      await prisma.$disconnect();
    });
    const reserve = (
      userId: string,
      extra: Partial<Parameters<typeof reserveBooking>[0]> = {},
    ) =>
      reserveBooking({
        userId,
        offeringId: offering,
        startsAt: start(),
        timezone: "UTC",
        locale: "ja",
        ...extra,
      });
    it("serializes concurrent reservations so only one takes the slot", async () => {
      const results = await Promise.allSettled([
        reserve(client),
        reserve(other),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        await prisma.booking.count({
          where: { trainerId: trainer, status: "PENDING" },
        }),
      ).toBe(1);
      expect(
        stripe.checkout.sessions.create.mock.calls[0][0].line_items[0]
          .price_data.unit_amount,
      ).toBe(5000);
    });
    it("blocks booking on a closed date even if weekly availability exists", async () => {
      const d = start();
      await prisma.availabilityException.create({
        data: {
          trainerId: trainer,
          startsAt: d,
          endsAt: new Date(d.getTime() + 3600000),
          available: false,
        },
      });
      await expect(reserve(client)).rejects.toThrow("no longer available");
    });
    it("prevents another client from canceling a reservation", async () => {
      const b = await reserve(client, { passId: pass });
      await expect(
        cancelReservation(b.bookingId, other, "test"),
      ).rejects.toThrow("Not authorized");
      expect(
        (await prisma.booking.findUniqueOrThrow({ where: { id: b.bookingId } }))
          .status,
      ).toBe("CONFIRMED");
    });
    it("books weekly credits atomically and returns a canceled credit only once", async () => {
      const b = await reserve(client, { passId: pass, count: 2 });
      expect(
        (await prisma.passPurchase.findUniqueOrThrow({ where: { id: pass } }))
          .remaining,
      ).toBe(2);
      await Promise.all([
        cancelReservation(b.bookingId, client, "test"),
        cancelReservation(b.bookingId, client, "test"),
      ]);
      expect(
        (await prisma.passPurchase.findUniqueOrThrow({ where: { id: pass } }))
          .remaining,
      ).toBe(3);
      expect(
        await prisma.booking.count({
          where: { trainerId: trainer, status: "CONFIRMED" },
        }),
      ).toBe(1);
    });
    it("rolls back all weekly dates and credits if a later date is occupied", async () => {
      await reserve(other, {
        startsAt: new Date(start().getTime() + 7 * 86400000),
      });
      await expect(
        reserve(client, { passId: pass, count: 2 }),
      ).rejects.toThrow();
      expect(
        (await prisma.passPurchase.findUniqueOrThrow({ where: { id: pass } }))
          .remaining,
      ).toBe(4);
      expect(await prisma.booking.count({ where: { clientId: client } })).toBe(
        0,
      );
    });
    it("does not return credits for late client cancellation", async () => {
      const b = await reserve(client, { passId: pass });
      await prisma.booking.update({
        where: { id: b.bookingId },
        data: { cancelBefore: new Date(Date.now() - 1000) },
      });
      await cancelReservation(b.bookingId, client, "late");
      expect(
        (await prisma.passPurchase.findUniqueOrThrow({ where: { id: pass } }))
          .remaining,
      ).toBe(3);
    });
    it("refunds a payment that arrives after cancellation without reopening the booking", async () => {
      const b = await reserve(client);
      await prisma.booking.update({
        where: { id: b.bookingId },
        data: {
          status: "CANCELED",
          refundAmount: 5000,
          refundStatus: "PENDING",
        },
      });
      const session = {
        id: `cs_${b.bookingId}`,
        mode: "payment",
        payment_status: "paid",
        payment_intent: `pi_${b.bookingId}`,
        amount_total: 5000,
        currency: "jpy",
        metadata: { bookingId: b.bookingId },
      } as unknown as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      await handleCheckoutSessionCompleted(session);
      const record = await prisma.booking.findUniqueOrThrow({
        where: { id: b.bookingId },
      });
      expect(record.status).toBe("CANCELED");
      expect(record.refundStatus).toBe("SUCCEEDED");
      expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
      expect(
        await prisma.paymentRecord.count({ where: { trainerId: trainer } }),
      ).toBe(1);
    });
    it("retries terminal refund failures and ignores a delayed failure from an older attempt", async () => {
      const b = await reserve(client);
      const pi = `pi_${b.bookingId}`,
        failedId = `re_failed_${b.bookingId}`,
        successId = `re_success_${b.bookingId}`;
      await prisma.booking.update({
        where: { id: b.bookingId },
        data: {
          status: "CANCELED",
          stripePaymentIntentId: pi,
          refundAmount: 5000,
          refundStatus: "PENDING",
        },
      });
      stripe.refunds.create
        .mockResolvedValueOnce({ id: failedId, status: "failed", amount: 5000 })
        .mockResolvedValueOnce({
          id: successId,
          status: "succeeded",
          amount: 5000,
        });
      stripe.refunds.retrieve.mockResolvedValue({
        id: failedId,
        status: "failed",
        amount: 5000,
        payment_intent: pi,
        metadata: { bookingId: b.bookingId },
      });
      await refundBooking(b.bookingId);
      expect(
        (await prisma.booking.findUniqueOrThrow({ where: { id: b.bookingId } }))
          .refundStatus,
      ).toBe("FAILED");
      await refundBooking(b.bookingId);
      expect(stripe.refunds.create.mock.calls[1][1].idempotencyKey).toBe(
        `booking-refund:${b.bookingId}:after:${failedId}`,
      );
      await handleRefundUpdated({ id: failedId } as Stripe.Refund);
      const record = await prisma.booking.findUniqueOrThrow({
        where: { id: b.bookingId },
      });
      expect(record.refundStatus).toBe("SUCCEEDED");
      expect(record.stripeRefundId).toBe(successId);
    });
    it("prevents trial reuse", async () => {
      await prisma.sessionOffering.update({
        where: { id: offering },
        data: { isTrial: true },
      });
      await reserve(client);
      await expect(
        reserve(client, { startsAt: new Date(start().getTime() + 86400000) }),
      ).rejects.toThrow("once per trainer");
    });
    it("keeps the original slot until the other participant approves a reschedule", async () => {
      const b = await reserve(client, { passId: pass });
      const next = new Date(start().getTime() + 86400000);
      const form = (op: string, extra: Record<string, string>) => {
        const f = new FormData();
        f.set("op", op);
        f.set("id", b.bookingId);
        for (const [key, value] of Object.entries(extra)) f.set(key, value);
        return f;
      };
      actor.id = client;
      actor.role = "CLIENT";
      await expect(
        mutate("ja", form("reschedule", { startsAtUtc: next.toISOString() })),
      ).rejects.toThrow("saved=1");
      let record = await prisma.booking.findUniqueOrThrow({
        where: { id: b.bookingId },
      });
      expect(record.startsAt).toEqual(start());
      expect(record.proposedStartsAt).toEqual(next);
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await expect(
          mutate(
            "ja",
            form("respondSchedule", { proposal: next.toISOString() }),
          ),
        ).rejects.toThrow("error=1");
      } finally {
        log.mockRestore();
      }
      actor.id = trainer;
      actor.role = "TRAINER";
      await expect(
        mutate("ja", form("respondSchedule", { proposal: next.toISOString() })),
      ).rejects.toThrow("saved=1");
      record = await prisma.booking.findUniqueOrThrow({
        where: { id: b.bookingId },
      });
      expect(record.startsAt).toEqual(next);
      expect(record.proposedStartsAt).toBeNull();
    });
    it("rejects reschedule acceptance when someone else has taken the proposed time", async () => {
      const b = await reserve(client, { passId: pass });
      const next = new Date(start().getTime() + 86400000);
      await prisma.booking.update({
        where: { id: b.bookingId },
        data: { proposedStartsAt: next, proposedBy: client },
      });
      await reserve(other, { startsAt: next });
      actor.id = trainer;
      actor.role = "TRAINER";
      const f = new FormData();
      f.set("op", "respondSchedule");
      f.set("id", b.bookingId);
      f.set("proposal", next.toISOString());
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await expect(mutate("en", f)).rejects.toThrow("error=1");
      } finally {
        log.mockRestore();
      }
      expect(
        (await prisma.booking.findUniqueOrThrow({ where: { id: b.bookingId } }))
          .startsAt,
      ).toEqual(start());
    });
    it("allows existing participants to see reschedule slots after a trainer unpublishes", async () => {
      const b = await reserve(client, { passId: pass });
      await prisma.trainerProfile.update({
        where: { id: profile },
        data: { isPublished: false },
      });
      const day = start().toISOString().slice(0, 10);
      expect(await availableSlots(offering, day, "UTC")).toEqual([]);
      expect(await availableSlots(offering, day, "UTC", b.bookingId)).toContain(
        start().toISOString(),
      );
    });
    it("reuses one subscription checkout for concurrent purchases", async () => {
      const plan = await prisma.subscriptionPlan.create({
        data: {
          trainerProfileId: profile,
          nameEn: "Concurrent plan",
          priceMonthly: 6000,
        },
      });
      stripe.customers.create.mockResolvedValue({ id: `cus_${client}` });
      stripe.checkout.sessions.create.mockResolvedValue({
        id: `cs_sub_${plan.id}`,
        url: "https://checkout.stripe.com/subscription",
      });
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        id: `cs_sub_${plan.id}`,
        status: "open",
        url: "https://checkout.stripe.com/subscription",
      });
      const results = await Promise.all([
        beginSubscription(client, plan.id, "ja"),
        beginSubscription(client, plan.id, "ja"),
      ]);
      expect(results).toEqual([
        "https://checkout.stripe.com/subscription",
        "https://checkout.stripe.com/subscription",
      ]);
      const keys = stripe.checkout.sessions.create.mock.calls.map(
        (call) => call[1].idempotencyKey,
      );
      expect(new Set(keys).size).toBe(1);
      expect(
        await prisma.subscriptionCheckout.count({
          where: { userId: client, planId: plan.id },
        }),
      ).toBe(1);
    });
    it("records recurring invoices once and restores active billing after payment", async () => {
      const plan = await prisma.subscriptionPlan.create({
        data: {
          trainerProfileId: profile,
          nameEn: "Monthly",
          priceMonthly: 6000,
        },
      });
      const sub = {
        id: `sub_${plan.id}`,
        status: "active",
        customer: `cus_${client}`,
        metadata: { dbUserId: client, subscriptionPlanId: plan.id },
        cancel_at_period_end: false,
        application_fee_percent: 6,
        items: {
          data: [
            {
              current_period_end: Math.floor(Date.now() / 1000) + 2592000,
              price: { unit_amount: 6000, currency: "jpy" },
              quantity: 1,
            },
          ],
        },
      };
      stripe.subscriptions.retrieve.mockResolvedValue(sub);
      const invoice = {
        id: `in_${plan.id}`,
        parent: { subscription_details: { subscription: sub.id } },
        amount_paid: 6000,
        currency: "jpy",
        created: Math.floor(Date.now() / 1000),
        status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
        payments: {
          data: [
            { status: "paid", payment: { payment_intent: `pi_${plan.id}` } },
          ],
        },
      };
      stripe.invoices.retrieve.mockResolvedValue(invoice);
      await handleInvoicePaid(invoice as unknown as Stripe.Invoice);
      await handleInvoicePaid(invoice as unknown as Stripe.Invoice);
      expect(
        await prisma.paymentRecord.count({ where: { id: invoice.id } }),
      ).toBe(1);
      expect(
        (
          await prisma.subscriptionPurchase.findUniqueOrThrow({
            where: { stripeSubscriptionId: sub.id },
          })
        ).status,
      ).toBe("ACTIVE");
      await prisma.subscriptionPurchase.deleteMany({
        where: { subscriptionPlanId: plan.id },
      });
      await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
    });
  },
);
