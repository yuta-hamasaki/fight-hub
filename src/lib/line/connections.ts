import { prisma } from "@/lib/prisma";

export function connectLine(userId: string, lineUserId: string, friendStatus: boolean) {
  return prisma.lineConnection.upsert({
    where: { userId },
    create: { userId, lineUserId, friendStatus },
    update: { lineUserId, friendStatus, notificationEnabled: true },
  });
}

export function disconnectLine(userId: string) {
  return prisma.lineConnection.deleteMany({ where: { userId } });
}

export function setLineNotifications(userId: string, enabled: boolean) {
  return prisma.lineConnection.updateMany({ where: { userId }, data: { notificationEnabled: enabled } });
}
