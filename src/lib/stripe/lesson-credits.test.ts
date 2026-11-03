import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptions: { retrieve: vi.fn() }, invoices: { retrieve: vi.fn() },
  purchase: { upsert: vi.fn(), findUnique: vi.fn() },
  payment: { upsert: vi.fn(), updateMany: vi.fn() },
  credit: { upsert: vi.fn() },
  plan: { findUnique: vi.fn() }, offering: { findFirst: vi.fn() },
  lock: vi.fn(), notify: vi.fn(),
  refunded: { findUnique: vi.fn() },
}));
vi.mock("@/lib/stripe", () => ({ getStripeClient: () => mocks }));
vi.mock("@/lib/marketplace/schedule", () => ({ paymentLock: mocks.lock, trainerLock: mocks.lock, userLock: mocks.lock }));
vi.mock("@/lib/marketplace/notifications", () => ({ notify: mocks.notify }));
vi.mock("@/lib/prisma", () => {
  const db = {
    subscriptionPurchase: mocks.purchase, subscriptionPlan: mocks.plan,
    sessionOffering: mocks.offering, paymentRecord: mocks.payment, passPurchase: mocks.credit,
    refundedPayment: mocks.refunded,
  };
  return { prisma: { ...db, $transaction: async (run: (db: unknown) => unknown) => run(db) } };
});
import { handleInvoicePaid } from "./subscription-webhooks";
import type Stripe from "stripe";

describe("paid monthly lesson credits", () => {
  const invoice = () => ({
    id: "in_paid", status: "paid", billing_reason: "subscription_cycle",
    parent: { subscription_details: { subscription: "sub_lessons" } },
    amount_paid: 6000, currency: "jpy", created: 1793491200,
    status_transitions: { paid_at: 1793491200 },
    payments: { data: [{ status: "paid", payment: { payment_intent: "pi_monthly" } }] },
    lines: { data: [{ parent: { subscription_item_details: { subscription_item: "si_lesson", proration: false } }, period: { start: 1793491200, end: 1796083200 } }] },
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refunded.findUnique.mockResolvedValue(null);
    mocks.subscriptions.retrieve.mockResolvedValue({
      id: "sub_lessons", status: "active", customer: "cus_client",
      metadata: { dbUserId: "client", subscriptionPlanId: "plan", sessionOfferingId: "lesson", sessionsPerMonth: "4" },
      cancel_at_period_end: false, application_fee_percent: 6,
      items: { data: [{ id: "si_lesson", current_period_end: 1796083200, price: { unit_amount: 6000, currency: "jpy" }, quantity: 1 }] },
    });
    mocks.plan.findUnique.mockResolvedValue({ id: "plan", priceMonthly: 6000, currency: "JPY" });
    mocks.purchase.findUnique.mockResolvedValue({ id: "purchase", userId: "client", subscriptionPlan: { nameEn: "Monthly lessons", trainerProfileId: "profile", trainerProfile: { userId: "trainer" } } });
    mocks.offering.findFirst.mockResolvedValue({ id: "lesson", trainerUserId: "trainer" });
    mocks.invoices.retrieve.mockResolvedValue(invoice());
  });
  const run = () => handleInvoicePaid(invoice() as unknown as Stripe.Invoice);

  it("grants snapshotted lesson terms for the paid period", async () => {
    await run();
    expect(mocks.credit.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { stripeInvoiceId: "in_paid" }, update: {},
      create: expect.objectContaining({ offeringId: "lesson", subscriptionPurchaseId: "purchase", credits: 4, remaining: 4, validFrom: new Date(1793491200000), expiresAt: new Date(1796083200000) }),
    }));
  });
  it("does not reset spent credits on a duplicate invoice", async () => {
    const rows = new Map<string, number>();
    mocks.credit.upsert.mockImplementation(({ where, create, update }) => {
      if (!rows.has(where.stripeInvoiceId)) rows.set(where.stripeInvoiceId, create.remaining);
      else expect(update).toEqual({});
    });
    await run();
    rows.set("in_paid", 2);
    await run();
    expect(rows.get("in_paid")).toBe(2);
  });
  it("does not restore credits when a full refund arrived first", async () => {
    mocks.refunded.findUnique.mockResolvedValue({ paymentIntentId: "pi_monthly" });
    await run();
    expect(mocks.credit.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ remaining: 0, status: "REFUNDED" }) }));
  });
  it.each(["open", "void", "uncollectible"])("does not grant unpaid invoice status %s", async (status) => {
    mocks.invoices.retrieve.mockResolvedValue({ ...invoice(), status });
    await run();
    expect(mocks.credit.upsert).not.toHaveBeenCalled();
  });
  it("does not grant lessons for proration invoices", async () => {
    mocks.invoices.retrieve.mockResolvedValue({ ...invoice(), billing_reason: "subscription_update" });
    await run();
    expect(mocks.credit.upsert).not.toHaveBeenCalled();
  });
  it("does not invent lesson terms for legacy subscriptions", async () => {
    const sub = await mocks.subscriptions.retrieve();
    mocks.subscriptions.retrieve.mockResolvedValue({ ...sub, metadata: { dbUserId: "client", subscriptionPlanId: "plan" } });
    await run();
    expect(mocks.credit.upsert).not.toHaveBeenCalled();
  });
  it("rejects a lesson belonging to another trainer", async () => {
    mocks.offering.findFirst.mockResolvedValue(null);
    await expect(run()).rejects.toThrow("does not belong");
    expect(mocks.credit.upsert).not.toHaveBeenCalled();
  });
});
