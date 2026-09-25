import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";

import { StripeOnboardingButton } from "../StripeOnboardingButton";
import { syncStripeAccountForCurrentTrainer } from "../actions";

const COPY = {
  en: {
    title: "Payout registration status",
    completed: "Stripe registration completed. You can now receive payments.",
    pending:
      "Your Stripe onboarding is not finished yet. Please continue to complete setup.",
    loading: "Redirecting...",
    continueCta: "Continue Stripe Registration",
    back: "Back to Stripe page",
  },
  ja: {
    title: "支払い受取の登録状況",
    completed: "Stripe登録が完了しました。支払いを受け取れるようになりました。",
    pending:
      "Stripeの登録手続きはまだ完了していません。続けて完了してください。",
    loading: "リダイレクト中...",
    continueCta: "Stripe登録を続ける",
    back: "Stripeページへ戻る",
  },
} as const;

export default async function StripeReturnPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = COPY[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const stripeAccount = await syncStripeAccountForCurrentTrainer(locale);
  const completed = Boolean(
    stripeAccount?.detailsSubmitted &&
    stripeAccount?.chargesEnabled &&
    stripeAccount?.payoutsEnabled,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold sm:text-3xl">{copy.title}</h1>
          <CardDescription>
            {completed ? copy.completed : copy.pending}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completed ? null : (
            <StripeOnboardingButton
              locale={locale}
              idleLabel={copy.continueCta}
              loadingLabel={copy.loading}
            />
          )}
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={`/${locale}/trainer/dashboard/stripe`}
          >
            {copy.back}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
