import { reconcileExpiredHolds } from "@/lib/marketplace/maintenance";
import { timingSafeEqual } from "node:crypto";

import { sendUpcomingBookingReminders } from "@/lib/notifications/service";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function GET(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [maintenance, reminders] = await Promise.allSettled([
    reconcileExpiredHolds(),
    sendUpcomingBookingReminders(),
  ]);
  for (const result of [maintenance, reminders]) {
    if (result.status === "rejected")
      console.error("Scheduled maintenance failed", result.reason);
  }
  const failed =
    (maintenance.status === "fulfilled" ? maintenance.value.failed : 1) +
    (reminders.status === "fulfilled" ? reminders.value.failed : 1);
  return Response.json(
    {
      processed:
        reminders.status === "fulfilled" ? reminders.value.processed : 0,
      reconciled:
        maintenance.status === "fulfilled" ? maintenance.value.reconciled : 0,
      failed,
    },
    { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
