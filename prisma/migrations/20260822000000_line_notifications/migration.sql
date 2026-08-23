CREATE TYPE "NotificationChannel" AS ENUM ('LINE');
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'TRAINER_NEW_BOOKING', 'BOOKING_REMINDER_24H', 'REVIEW_REQUEST');

CREATE TABLE "LineConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lineUserId" TEXT NOT NULL,
  "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "friendStatus" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LineConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LineConnection_userId_key" ON "LineConnection"("userId");
CREATE UNIQUE INDEX "LineConnection_lineUserId_key" ON "LineConnection"("lineUserId");
CREATE UNIQUE INDEX "NotificationLog_userId_bookingId_type_channel_key" ON "NotificationLog"("userId", "bookingId", "type", "channel");
CREATE INDEX "NotificationLog_bookingId_idx" ON "NotificationLog"("bookingId");
CREATE INDEX "NotificationLog_type_sentAt_idx" ON "NotificationLog"("type", "sentAt");
ALTER TABLE "LineConnection" ADD CONSTRAINT "LineConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
