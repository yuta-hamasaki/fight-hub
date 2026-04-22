import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/constants/locales";

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
    <Link
      href={`/${locale}/api/stripe/checkout?planId=${encodeURIComponent(planId)}`}
      className={buttonVariants({ size: "sm" })}
    >
      {label}
    </Link>
  );
}
