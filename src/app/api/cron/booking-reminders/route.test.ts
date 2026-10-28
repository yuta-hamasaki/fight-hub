import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ maintenance: vi.fn(), reminders: vi.fn() }));
vi.mock("@/lib/marketplace/maintenance", () => ({
  reconcileExpiredHolds: mocks.maintenance,
}));
vi.mock("@/lib/notifications/service", () => ({
  sendUpcomingBookingReminders: mocks.reminders,
}));
import { GET } from "./route";

describe("maintenance monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.maintenance.mockResolvedValue({ reconciled: 2, failed: 0 });
    mocks.reminders.mockResolvedValue({ processed: 3, failed: 0 });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const request = (token = "test-cron-secret") =>
    new Request("https://example.com/api/cron/booking-reminders", {
      headers: { Authorization: `Bearer ${token}` },
    });

  it("rejects unauthorized calls without running jobs", async () => {
    expect((await GET(request("wrong-secret"))).status).toBe(401);
    expect(mocks.maintenance).not.toHaveBeenCalled();
    expect(mocks.reminders).not.toHaveBeenCalled();
  });

  it("rejects multibyte tokens with the same character count without throwing", async () => {
    vi.stubEnv("CRON_SECRET", "abc");
    expect((await GET(request("ééé"))).status).toBe(401);
  });

  it("returns counts when both jobs succeed", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      reconciled: 2,
      processed: 3,
      failed: 0,
    });
  });

  it("reports partial failures to the scheduler", async () => {
    mocks.maintenance.mockResolvedValue({ reconciled: 2, failed: 1 });
    expect((await GET(request())).status).toBe(503);
    expect(mocks.reminders).toHaveBeenCalledOnce();
  });

  it("still runs reminders when reconciliation throws and hides internal errors", async () => {
    mocks.maintenance.mockRejectedValue(
      new Error("private connection details"),
    );
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      reconciled: 0,
      processed: 3,
      failed: 1,
    });
    expect(mocks.reminders).toHaveBeenCalledOnce();
  });
});
