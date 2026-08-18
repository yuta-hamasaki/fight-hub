-- Add payment and cancellation tracking to session bookings.
ALTER TABLE "Booking"
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "amountPaid" DECIMAL(10,2),
ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'JPY',
ADD COLUMN "canceledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT;

CREATE UNIQUE INDEX "Booking_stripeCheckoutSessionId_key" ON "Booking"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Booking_stripePaymentIntentId_key" ON "Booking"("stripePaymentIntentId");

-- Weekly UTC booking windows configured by each trainer.
CREATE TABLE "TrainerAvailability" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainerAvailability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainerAvailability_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrainerAvailability_trainerId_dayOfWeek_isActive_idx"
ON "TrainerAvailability"("trainerId", "dayOfWeek", "isActive");
