import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";

import { StripeOnboardingButton } from "../StripeOnboardingButton";

const COPY = {
  en: {
    title: "Stripe onboarding refresh",
    description: "Your onboarding link expired or was interrupted. Generate a fresh link to continue.",
    cta: "Continue Stripe Registration",
    loading: "Redirecting...",
    back: "Back to Stripe page",
  },
  ja: {
    title: "Stripeオンボーディング再開",
    description: "オンボーディングリンクの有効期限が切れたか中断されました。新しいリンクを発行して続行してください。",
    cta: "Stripe登録を続ける",
    loading: "リダイレクト中...",
    back: "Stripeページへ戻る",
  },
} as const;

export default async function StripeRefreshPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = COPY[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StripeOnboardingButton locale={locale} idleLabel={copy.cta} loadingLabel={copy.loading} />
          <Button asChild variant="outline">
            <Link href={`/${locale}/trainer/dashboard/stripe`}>{copy.back}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
