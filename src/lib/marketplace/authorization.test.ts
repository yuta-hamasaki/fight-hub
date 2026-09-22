import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { id: "client-a", role: "CLIENT", clerkUserId: "test", email: null },
  booking: { findFirst: vi.fn(), updateMany: vi.fn() },
  assignment: { updateMany: vi.fn() },
  review: { updateMany: vi.fn() },
  supportTicket: { update: vi.fn() },
  notification: { updateMany: vi.fn() },
  coachingRecord: { upsert: vi.fn() },
  subscriptionPurchase: { findFirst: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({
  requireDbUser: async () => mocks.user,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: mocks.booking,
    assignment: mocks.assignment,
    review: mocks.review,
    supportTicket: mocks.supportTicket,
    appNotification: mocks.notification,
    coachingRecord: mocks.coachingRecord,
    subscriptionPurchase: mocks.subscriptionPurchase,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import { mutate } from "@/app/[locale]/dashboard/workspace/actions";
const form = (op: string, values: Record<string, string> = {}) => {
  const f = new FormData();
  f.set("op", op);
  for (const [key, value] of Object.entries(values)) f.set(key, value);
  return f;
};
describe("workspace mutation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.role = "CLIENT";
    mocks.booking.findFirst.mockResolvedValue(null);
    mocks.subscriptionPurchase.findFirst.mockResolvedValue(null);
  });
  it("does not let clients answer support tickets", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      mutate("ja", form("supportReply", { id: "ticket", response: "forged" })),
    ).rejects.toThrow("error=1");
    expect(mocks.supportTicket.update).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("scopes assignment progress to the authenticated client", async () => {
    await expect(
      mutate(
        "en",
        form("progress", { id: "someone-elses-task", progress: "done" }),
      ),
    ).rejects.toThrow("saved=1");
    expect(mocks.assignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "someone-elses-task", clientId: "client-a" },
      }),
    );
  });
  it("scopes trainer replies to the receiving trainer", async () => {
    mocks.user.role = "TRAINER";
    await expect(
      mutate("en", form("reviewReply", { id: "review", reply: "hello" })),
    ).rejects.toThrow("saved=1");
    expect(mocks.review.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "review", targetUserId: "client-a" },
      }),
    );
  });
  it("rejects a trainer reading or editing an unrelated client through an action", async () => {
    mocks.user.role = "TRAINER";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      mutate(
        "en",
        form("notes", { clientId: "unrelated", privateNotes: "private" }),
      ),
    ).rejects.toThrow("error=1");
    expect(mocks.coachingRecord.upsert).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("only marks the current user notifications as read", async () => {
    await expect(
      mutate("en", form("read", { userId: "another-user" })),
    ).rejects.toThrow("saved=1");
    expect(mocks.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "client-a", readAt: null } }),
    );
  });
});
