import type { Locale } from "@/lib/constants/locales";
import { buttonVariants } from "@/components/ui/button";
export function PurchaseSubscriptionButton({
  locale,
  planId,
  label,
}: {
  locale: Locale;
  planId: string;
  label: string;
}) {
  return (
    <form method="post" action={`/${locale}/api/stripe/checkout`}>
      <input type="hidden" name="planId" value={planId} />
      <button type="submit" className={buttonVariants({ size: "sm" })}>
        {label}
      </button>
    </form>
  );
}
