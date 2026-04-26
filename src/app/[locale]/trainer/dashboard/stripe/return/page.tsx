import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";

import { StripeOnboardingButton } from "../StripeOnboardingButton";
import { syncStripeAccountForCurrentTrainer } from "../actions";

const COPY = {
  en: {
    title: "Stripe onboarding return",
    completed: "Stripe registration completed. You can now receive payments.",
    pending: "Your Stripe onboarding is not finished yet. Please continue to complete setup.",
    loading: "Redirecting...",
    continueCta: "Continue Stripe Registration",
    back: "Back to Stripe page",
  },
  ja: {
    title: "Stripeオンボーディング戻りページ",
    completed: "Stripe登録が完了しました。支払いを受け取れるようになりました。",
    pending: "Stripeのオンボーディングはまだ完了していません。続けて完了してください。",
    loading: "リダイレクト中...",
    continueCta: "Stripe登録を続ける",
    back: "Stripeページへ戻る",
  },
} as const;

export default async function StripeReturnPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = COPY[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const stripeAccount = await syncStripeAccountForCurrentTrainer(locale);
  const completed = Boolean(stripeAccount?.detailsSubmitted && stripeAccount?.chargesEnabled && stripeAccount?.payoutsEnabled);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{completed ? copy.completed : copy.pending}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completed ? null : (
            <StripeOnboardingButton locale={locale} idleLabel={copy.continueCta} loadingLabel={copy.loading} />
          )}
          <Button asChild variant="outline">
            <Link href={`/${locale}/trainer/dashboard/stripe`}>{copy.back}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
