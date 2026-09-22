import { prisma } from "@/lib/prisma";
import { availableSlots } from "@/lib/marketplace/schedule";
import { validTimezone } from "@/lib/marketplace/rules";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams,
    day = q.get("day") || "",
    timezone = q.get("timezone") || "UTC";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !validTimezone(timezone))
    return new Response("Invalid", { status: 400 });
  const offerings = await prisma.sessionOffering.findMany({
    where: { isActive: true, trainerProfile: { isPublished: true } },
    select: { id: true, trainerProfileId: true },
  });
  const ids = new Set<string>();
  // Bound concurrent database work while searching all published offerings.
  for (let i = 0; i < offerings.length; i += 5)
    await Promise.all(
      offerings.slice(i, i + 5).map(async (o) => {
        if (
          !ids.has(o.trainerProfileId) &&
          (await availableSlots(o.id, day, timezone)).length
        )
          ids.add(o.trainerProfileId);
      }),
    );
  return Response.json({ trainerIds: [...ids] });
}
