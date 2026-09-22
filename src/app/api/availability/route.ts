import { availableSlots } from "@/lib/marketplace/schedule";
import { validTimezone } from "@/lib/marketplace/rules";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const day = p.get("day") ?? "",
    timezone = p.get("timezone") ?? "UTC",
    offering = p.get("offering") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !validTimezone(timezone) || !offering)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  return Response.json({
    slots: await availableSlots(offering, day, timezone),
  });
}
