export const PLATFORM_FEE_BPS = 600;

/**
 * Stripe's `application_fee_amount` expects the smallest currency unit (for example cents).
 * We keep this helper isolated so future checkout/session logic can reuse one fee policy.
 */
export function calculatePlatformFeeAmount(amountInMinorUnits: number) {
  if (!Number.isFinite(amountInMinorUnits) || amountInMinorUnits <= 0) {
    return 0;
  }

  return Math.round((amountInMinorUnits * PLATFORM_FEE_BPS) / 10_000);
}
