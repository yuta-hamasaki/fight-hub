-- Remove retired content-library notifications and the content publishing schema.
DELETE FROM "AppNotification"
WHERE "path" LIKE '/dashboard/trainer/content%'
   OR "path" LIKE '/dashboard/client/content%';

DROP TABLE "ContentAccess";
DROP TABLE "ContentPost";
DROP TYPE "PremiumContentType";
DROP TYPE "ContentStatus";
