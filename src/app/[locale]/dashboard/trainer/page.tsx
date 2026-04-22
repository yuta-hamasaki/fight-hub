import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { PLATFORM_FEE_BPS } from "@/lib/billing/fees";
import { getTrainerStripeOnboardingStatus } from "@/lib/stripe/connect";

import { refreshTrainerStripeStatus, startTrainerStripeOnboarding } from "./actions";

export default async function TrainerDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const stripeStatus = await getTrainerStripeOnboardingStatus(user.id);

  const badgeTone = stripeStatus.onboardingComplete
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{copy.trainerDashboardTitle}</CardTitle>
          <CardDescription>{copy.trainerDashboardDescription}</CardDescription>
        </CardHeader>
        <CardContent>{copy.trainerDashboardBody}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.trainerStripeConnectTitle}</CardTitle>
          <CardDescription>{copy.trainerStripeConnectDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${badgeTone}`}>
            {stripeStatus.onboardingComplete ? copy.trainerStripeComplete : copy.trainerStripeIncomplete}
          </span>

          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{copy.trainerStripeDetailSubmitted}: {stripeStatus.detailsSubmitted ? "Yes" : "No"}</li>
            <li>{copy.trainerStripeChargesEnabled}: {stripeStatus.chargesEnabled ? "Yes" : "No"}</li>
            <li>{copy.trainerStripePayoutsEnabled}: {stripeStatus.payoutsEnabled ? "Yes" : "No"}</li>
            <li>{copy.trainerStripePlatformFee}: {(PLATFORM_FEE_BPS / 100).toFixed(0)}%</li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <form
              action={startTrainerStripeOnboarding.bind(null, {
                locale,
                userId: user.id,
                email: user.email,
              })}
            >
              <Button type="submit">{copy.trainerStripeStartOnboarding}</Button>
            </form>
            <form action={refreshTrainerStripeStatus.bind(null, stripeStatus.stripeAccountId)}>
              <Button type="submit" variant="outline">
                {copy.trainerStripeRefreshStatus}
              </Button>
            </form>
          </div>

          {!stripeStatus.onboardingComplete ? (
            <p className="text-sm text-muted-foreground">{copy.trainerStripeMonetizationBlocked}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
