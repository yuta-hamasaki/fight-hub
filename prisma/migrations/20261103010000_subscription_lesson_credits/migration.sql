-- Existing plans remain unavailable for new purchases until their lesson terms are configured.
ALTER TABLE "SubscriptionPlan" ADD COLUMN "sessionOfferingId" TEXT,
    ADD COLUMN "sessionsPerMonth" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_sessionOfferingId_fkey"
    FOREIGN KEY ("sessionOfferingId") REFERENCES "SessionOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_lesson_terms_check"
    CHECK (("sessionOfferingId" IS NULL AND "sessionsPerMonth" IS NULL)
        OR ("sessionOfferingId" IS NOT NULL AND "sessionsPerMonth" IS NOT NULL AND "sessionsPerMonth" BETWEEN 1 AND 50));
UPDATE "SubscriptionPlan" SET "isActive" = FALSE WHERE "sessionOfferingId" IS NULL;

ALTER TABLE "PassPurchase" ALTER COLUMN "packageId" DROP NOT NULL,
    ADD COLUMN "subscriptionPurchaseId" TEXT,
    ADD COLUMN "stripeInvoiceId" TEXT,
    ADD COLUMN "validFrom" TIMESTAMP(3);
CREATE UNIQUE INDEX "PassPurchase_stripeInvoiceId_key" ON "PassPurchase"("stripeInvoiceId");
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_subscriptionPurchaseId_fkey"
    FOREIGN KEY ("subscriptionPurchaseId") REFERENCES "SubscriptionPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_source_check"
    CHECK (("packageId" IS NOT NULL AND "subscriptionPurchaseId" IS NULL AND "stripeInvoiceId" IS NULL)
        OR ("packageId" IS NULL AND "subscriptionPurchaseId" IS NOT NULL AND "stripeInvoiceId" IS NOT NULL));
CREATE INDEX "PassPurchase_subscriptionPurchaseId_idx" ON "PassPurchase"("subscriptionPurchaseId");
ALTER TABLE "PassPurchase" ADD CONSTRAINT "PassPurchase_remaining_check"
    CHECK ("credits" > 0 AND "remaining" BETWEEN 0 AND "credits");

CREATE TABLE "RefundedPayment" (
    "paymentIntentId" TEXT NOT NULL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
