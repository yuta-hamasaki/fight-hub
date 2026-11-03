export function validLessonTerms(offeringId: string | null | undefined, sessions: number | null | undefined) {
  return Boolean(offeringId) && Number.isInteger(sessions) && sessions! >= 1 && sessions! <= 50;
}

export function creditCoversSession(
  credit: { status: string; validFrom: Date | null; expiresAt: Date | null },
  startsAt: Date,
  now = new Date(),
) {
  return credit.status === "ACTIVE" && Number.isFinite(startsAt.getTime()) &&
    (!credit.validFrom || (credit.validFrom <= now && credit.validFrom <= startsAt)) &&
    Boolean(credit.expiresAt && credit.expiresAt > now && credit.expiresAt > startsAt);
}
