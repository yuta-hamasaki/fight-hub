import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response("Forbidden", { status: 403 });
  const { trainerId } = await request.json().catch(() => ({}));
  if (typeof trainerId !== "string" || trainerId.length > 100)
    return new Response("Invalid", { status: 400 });
  if (
    !(await prisma.trainerProfile.findFirst({
      where: { id: trainerId, isPublished: true },
      select: { id: true },
    }))
  )
    return new Response("Not found", { status: 404 });
  const jar = await cookies();
  let visitorKey = jar.get("fh-visitor")?.value;
  if (!visitorKey || !/^[a-f\d-]{36}$/.test(visitorKey)) {
    visitorKey = randomUUID();
    jar.set("fh-visitor", visitorKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  const day = new Date().toISOString().slice(0, 10);
  await prisma.profileView.upsert({
    where: {
      trainerProfileId_visitorKey_day: {
        trainerProfileId: trainerId,
        visitorKey,
        day,
      },
    },
    create: { trainerProfileId: trainerId, visitorKey, day },
    update: {},
  });
  return new Response(null, { status: 204 });
}
