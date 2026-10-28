import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  retrieve: vi.fn(),
  completed: vi.fn(),
  expired: vi.fn(),
  refund: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { booking: { findMany: mocks.findMany, update: mocks.update } },
}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { retrieve: mocks.retrieve } },
  }),
}));
vi.mock("@/lib/stripe/subscription-webhooks", () => ({
  handleCheckoutSessionCompleted: mocks.completed,
  handleCheckoutSessionExpired: mocks.expired,
}));
vi.mock("./bookings", () => ({ refundBooking: mocks.refund }));
import { reconcileExpiredHolds } from "./maintenance";

describe("maintenance failure reporting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("reports no failures when there is no pending work", async () => {
    mocks.findMany.mockResolvedValue([]);
    await expect(reconcileExpiredHolds()).resolves.toEqual({
      reconciled: 0,
      failed: 0,
    });
  });

  it("continues other holds and refund retries after one Stripe retrieval fails", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        { id: "one", stripeCheckoutSessionId: "cs_one" },
        { id: "two", stripeCheckoutSessionId: "cs_two" },
      ])
      .mockResolvedValueOnce([{ id: "refund" }]);
    mocks.retrieve
      .mockRejectedValueOnce(new Error("Stripe unavailable"))
      .mockResolvedValueOnce({
        id: "cs_two",
        status: "expired",
        payment_status: "unpaid",
      });
    mocks.refund.mockResolvedValue("FAILED");
    await expect(reconcileExpiredHolds()).resolves.toEqual({
      reconciled: 2,
      failed: 2,
    });
    expect(mocks.expired).toHaveBeenCalledOnce();
    expect(mocks.refund).toHaveBeenCalledWith("refund");
  });

  it("continues refunds after a thrown failure and treats Stripe pending as non-failure", async () => {
    mocks.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "one" }, { id: "two" }]);
    mocks.refund
      .mockRejectedValueOnce(new Error("DB unavailable"))
      .mockResolvedValueOnce("PENDING");
    await expect(reconcileExpiredHolds()).resolves.toEqual({
      reconciled: 0,
      failed: 1,
    });
    expect(mocks.refund).toHaveBeenCalledTimes(2);
  });
});
