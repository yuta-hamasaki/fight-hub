-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "bookingLeadHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "cancellationHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo';

-- AlterTable
ALTER TABLE "SessionOffering" ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "preparation" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelBefore" TIMESTAMP(3),
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "passPurchaseId" TEXT,
ADD COLUMN     "preparation" TEXT,
ADD COLUMN     "proposedBy" TEXT,
ADD COLUMN     "proposedStartsAt" TIMESTAMP(3),
ADD COLUMN     "refundAmount" DECIMAL(10,2),
ADD COLUMN     "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable
ALTER TABLE "SubscriptionPurchase" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'JPY',
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "priceMonthly" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "trainerReply" TEXT;

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientIntake" (
    "userId" TEXT NOT NULL,
    "goals" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientIntake_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CoachingRecord" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "privateNotes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CoachingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "bookingId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleJa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","trainerProfileId")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileView" (
    "trainerProfileId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "day" TEXT NOT NULL,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("trainerProfileId","visitorKey","day")
);

-- CreateTable
CREATE TABLE "SubscriptionCheckout" (
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCheckout_pkey" PRIMARY KEY ("userId","planId")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "refunded" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "paymentIntentId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionPackage" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "validityDays" INTEGER NOT NULL DEFAULT 90,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SessionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "validityDays" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkoutSessionId" TEXT,
    "paymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityException_trainerId_startsAt_idx" ON "AvailabilityException"("trainerId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingRecord_trainerId_clientId_key" ON "CoachingRecord"("trainerId", "clientId");

-- CreateIndex
CREATE INDEX "Assignment_clientId_createdAt_idx" ON "Assignment"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_trainerId_clientId_idx" ON "Assignment"("trainerId", "clientId");

-- CreateIndex
CREATE INDEX "Message_trainerId_clientId_createdAt_idx" ON "Message"("trainerId", "clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppNotification_dedupeKey_key" ON "AppNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "AppNotification_userId_createdAt_idx" ON "AppNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionCheckout_sessionId_key" ON "SubscriptionCheckout"("sessionId");

-- CreateIndex
CREATE INDEX "PaymentRecord_trainerId_occurredAt_idx" ON "PaymentRecord"("trainerId", "occurredAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_paymentIntentId_idx" ON "PaymentRecord"("paymentIntentId");

-- CreateIndex
CREATE INDEX "SessionPackage_trainerId_active_idx" ON "SessionPackage"("trainerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PassPurchase_checkoutSessionId_key" ON "PassPurchase"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PassPurchase_paymentIntentId_key" ON "PassPurchase"("paymentIntentId");

-- CreateIndex
CREATE INDEX "PassPurchase_userId_status_idx" ON "PassPurchase"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripeRefundId_key" ON "Booking"("stripeRefundId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_passPurchaseId_fkey" FOREIGN KEY ("passPurchaseId") REFERENCES "PassPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientIntake" ADD CONSTRAINT "ClientIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingRecord" ADD CONSTRAINT "CoachingRecord_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingRecord" ADD CONSTRAINT "CoachingRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCheckout" ADD CONSTRAINT "SubscriptionCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCheckout" ADD CONSTRAINT "SubscriptionCheckout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPackage" ADD CONSTRAINT "SessionPackage_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPackage" ADD CONSTRAINT "SessionPackage_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "SessionOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "SessionOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SessionPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
