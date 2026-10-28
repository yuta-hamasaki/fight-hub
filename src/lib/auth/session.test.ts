import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { upsert: mocks.upsert } } }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

import { requireDbUser } from "./session";

describe("account access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk-user" });
    mocks.currentUser.mockResolvedValue({ emailAddresses: [] });
  });

  it("rejects signed-out requests before touching the database", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(requireDbUser("ja")).rejects.toThrow("redirect:/ja/sign-in");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it.each(["ja", "en"] as const)(
    "blocks suspended accounts in %s",
    async (locale) => {
      mocks.upsert.mockResolvedValue({
        id: "user",
        role: "CLIENT",
        isActive: false,
      });
      await expect(requireDbUser(locale)).rejects.toThrow(
        `redirect:/${locale}/account-suspended`,
      );
      // Signing in again must never reactivate the database account.
      expect(mocks.upsert.mock.calls[0][0].update).not.toHaveProperty(
        "isActive",
      );
    },
  );

  it("allows an active account", async () => {
    const user = { id: "user", role: "TRAINER", isActive: true };
    mocks.upsert.mockResolvedValue(user);
    await expect(requireDbUser("en")).resolves.toEqual(user);
  });
});
