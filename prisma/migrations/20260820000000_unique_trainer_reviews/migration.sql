-- A client can maintain one review per trainer. Existing duplicates are reduced
-- to the most recently updated review before the constraint is installed.
DELETE FROM "Review" older
USING "Review" newer
WHERE older."trainerProfileId" = newer."trainerProfileId"
  AND older."reviewerId" = newer."reviewerId"
  AND (older."updatedAt", older.id) < (newer."updatedAt", newer.id);

CREATE UNIQUE INDEX "Review_trainerProfileId_reviewerId_key"
ON "Review"("trainerProfileId", "reviewerId");
