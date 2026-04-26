import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

import { StripeOnboardingButton } from "./StripeOnboardingButton";

type Copy = {
  title: string;
  description: string;
  statusLabel: string;
  statusNotStarted: string;
  statusPending: string;
  statusCompleted: string;
  completedMessage: string;
  pendingMessage: string;
  startCta: string;
  continueCta: string;
  loading: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "Stripe Connect registration",
    description: "Connect your Stripe account to receive payments.",
    statusLabel: "Onboarding status",
    statusNotStarted: "Not started",
    statusPending: "Pending",
    statusCompleted: "Completed",
    completedMessage: "Stripe registration completed. You can now receive payments.",
    pendingMessage: "Stripe onboarding is in progress. Continue onboarding to complete setup.",
    startCta: "Start Stripe Registration",
    continueCta: "Continue Stripe Registration",
    loading: "Redirecting...",
  },
  ja: {
    title: "Stripe Connect登録",
    description: "支払い受取のためにStripeアカウントを連携します。",
    statusLabel: "オンボーディング状況",
    statusNotStarted: "未開始",
    statusPending: "手続き中",
    statusCompleted: "完了",
    completedMessage: "Stripe登録が完了しました。支払いを受け取れるようになりました。",
    pendingMessage: "Stripeのオンボーディングは進行中です。続けて完了してください。",
    startCta: "Stripe登録を開始",
    continueCta: "Stripe登録を続ける",
    loading: "リダイレクト中...",
  },
};

function resolveStatus(account: {
  onboardingStatus: "NOT_STARTED" | "PENDING" | "COMPLETED";
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
} | null) {
  if (!account) {
    return "NOT_STARTED" as const;
  }

  if (account.detailsSubmitted && account.chargesEnabled && account.payoutsEnabled) {
    return "COMPLETED" as const;
  }

  return account.onboardingStatus === "COMPLETED" ? "COMPLETED" : "PENDING";
}

export default async function TrainerStripePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = COPY[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const stripeAccount = await prisma.stripeAccount.findUnique({
    where: { userId: user.id },
    select: {
      onboardingStatus: true,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    },
  });

  const status = resolveStatus(stripeAccount);
  const statusText =
    status === "COMPLETED"
      ? copy.statusCompleted
      : status === "PENDING"
        ? copy.statusPending
        : copy.statusNotStarted;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {copy.statusLabel}: <span className="font-medium text-foreground">{statusText}</span>
          </p>

          {status === "COMPLETED" ? (
            <p className="text-sm font-medium text-emerald-700">{copy.completedMessage}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{status === "PENDING" ? copy.pendingMessage : null}</p>
              <StripeOnboardingButton
                locale={locale}
                idleLabel={status === "PENDING" ? copy.continueCta : copy.startCta}
                loadingLabel={copy.loading}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
