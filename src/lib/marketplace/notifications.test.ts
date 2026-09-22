import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  line: vi.fn(),
  profile: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appNotification: { create: mocks.create },
    lineConnection: { findUnique: mocks.line },
    profile: { findUnique: mocks.profile },
  },
}));
vi.mock("@/lib/line/messaging", () => ({ sendLineText: mocks.send }));
import { notify } from "./notifications";
describe("in-app and LINE notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ id: "notice" });
    mocks.line.mockResolvedValue(null);
    mocks.profile.mockResolvedValue({ locale: "ja" });
    mocks.send.mockResolvedValue(undefined);
  });
  it("keeps an in-app notification when LINE is not connected", async () => {
    await notify(
      "user",
      "予約変更",
      "Booking changed",
      "/dashboard/bookings/one",
      "change:one",
    );
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("allows only the winner of a concurrent notification claim to send LINE", async () => {
    mocks.line.mockResolvedValue({
      notificationEnabled: true,
      friendStatus: true,
      lineUserId: "line-user",
    });
    const claimed = new Set<string>();
    mocks.create.mockImplementation(async ({ data }) => {
      if (claimed.has(data.dedupeKey))
        throw new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "7.7.0",
        });
      claimed.add(data.dedupeKey);
      return { id: "notice" };
    });
    await Promise.all([
      notify(
        "user",
        "予約変更",
        "Booking changed",
        "/dashboard/bookings/one",
        "change:one",
      ),
      notify(
        "user",
        "予約変更",
        "Booking changed",
        "/dashboard/bookings/one",
        "change:one",
      ),
    ]);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
});
