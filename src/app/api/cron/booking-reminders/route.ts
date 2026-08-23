import { timingSafeEqual } from "node:crypto";

import { sendUpcomingBookingReminders } from "@/lib/notifications/service";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const processed = await sendUpcomingBookingReminders();
  return Response.json({ processed });
}
