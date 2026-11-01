import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  lock: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (run: (db: unknown) => Promise<unknown>) => run({
      booking: { findUniqueOrThrow: mocks.findUniqueOrThrow, update: mocks.update },
    }),
  },
}));
vi.mock("./schedule", () => ({ trainerLock: mocks.lock }));
vi.mock("./notifications", () => ({ notifyBooking: mocks.notify }));
import { approveReservation } from "./bookings";

describe("booking request approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: "booking", trainerId: "trainer", status: "PENDING",
      startsAt: new Date(Date.now() + 86400000),
      passPurchaseId: null, stripePaymentIntentId: "pi_paid",
    });
  });

  it("confirms a funded request and notifies participants", async () => {
    await approveReservation("booking", "trainer");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "booking" }, data: { status: "CONFIRMED", holdExpiresAt: null },
    });
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it("rejects another trainer", async () => {
    await expect(approveReservation("booking", "other")).rejects.toThrow("Not authorized");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    { stripePaymentIntentId: null },
    { status: "CANCELED" },
    { startsAt: new Date(0) },
  ])("rejects an ineligible request: %j", async (override) => {
    const booking = await mocks.findUniqueOrThrow();
    mocks.findUniqueOrThrow.mockResolvedValue({ ...booking, ...override });
    await expect(approveReservation("booking", "trainer")).rejects.toThrow("Only future, paid");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("accepts a session credit request", async () => {
    const booking = await mocks.findUniqueOrThrow();
    mocks.findUniqueOrThrow.mockResolvedValue({ ...booking, stripePaymentIntentId: null, passPurchaseId: "pass" });
    await approveReservation("booking", "trainer");
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("does not repeat confirmation or notifications", async () => {
    const booking = await mocks.findUniqueOrThrow();
    mocks.findUniqueOrThrow.mockResolvedValue({ ...booking, status: "CONFIRMED" });
    await approveReservation("booking", "trainer");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
