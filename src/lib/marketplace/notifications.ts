import { prisma } from "@/lib/prisma";
import { sendLineText } from "@/lib/line/messaging";
export async function notify(
  userId: string,
  titleJa: string,
  titleEn: string,
  path: string,
  dedupeKey?: string,
) {
  // An in-app notification remains available even if LINE is disconnected or fails.
  const data = { userId, titleJa, titleEn, path, dedupeKey };
  if (dedupeKey) {
    const exists = await prisma.appNotification.findUnique({
      where: { dedupeKey },
    });
    if (exists) return;
    await prisma.appNotification.upsert({
      where: { dedupeKey },
      create: data,
      update: {},
    });
  } else await prisma.appNotification.create({ data });
  const [line, profile] = await Promise.all([
    prisma.lineConnection.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);
  if (line?.notificationEnabled && line.friendStatus) {
    const locale = profile?.locale === "en" ? "en" : "ja";
    await sendLineText(
      line.lineUserId,
      `${locale === "ja" ? titleJa : titleEn}\n${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}${path}`,
    ).catch(() => undefined);
  }
}
export async function notifyBooking(
  id: string,
  ja: string,
  en: string,
  key?: string,
) {
  const b = await prisma.booking.findUniqueOrThrow({ where: { id } });
  await Promise.allSettled(
    [b.clientId, b.trainerId].map((userId) =>
      notify(
        userId,
        ja,
        en,
        `/dashboard/bookings/${id}`,
        key ? `${key}:${userId}` : undefined,
      ),
    ),
  );
}
