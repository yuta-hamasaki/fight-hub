import { availableSlots } from "@/lib/marketplace/schedule";
import { validTimezone } from "@/lib/marketplace/rules";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const day = p.get("day") ?? "",
    timezone = p.get("timezone") ?? "UTC",
    offering = p.get("offering") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !validTimezone(timezone) || !offering)
    return Response.json({ error: "Invalid request" }, { status: 400 });
  const bookingId = p.get("booking") || undefined;
  if (bookingId) {
    const { userId } = await auth();
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        sessionOfferingId: offering,
        status: "CONFIRMED",
        OR: [
          { client: { clerkUserId: userId } },
          { trainer: { clerkUserId: userId } },
        ],
      },
      select: { id: true },
    });
    if (!booking) return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({
    slots: await availableSlots(offering, day, timezone, bookingId),
  });
}
