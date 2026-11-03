import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { prisma } from "@/lib/prisma";
import { getActiveSubscriptions } from "@/lib/subscriptions";
// LINE deferred until a future release.
// import { LineConnectionCard } from "@/components/line/line-connection-card";

export default async function ClientDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ booking?: string; purchase?: string; line?: string }>;
}) {
  const { locale } = await params;
  const result = await searchParams;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }
  const [subscriptions, bookings /* , lineConnection */] =
    await Promise.all([
      getActiveSubscriptions(user.id, locale),
      prisma.booking.findMany({
        where: { clientId: user.id },
        include: {
          trainer: { include: { profile: true } },
          sessionOffering: true,
        },
        orderBy: { startsAt: "desc" },
        take: 20,
      }),
      // prisma.lineConnection.findUnique({ where: { userId: user.id } }),
    ]);

  const bookingCount = await prisma.booking.count({
    where: { clientId: user.id },
  });

  return (
    <div className="space-y-6">
      {result.booking === "success" || result.purchase === "success" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {locale === "ja"
            ? "決済が完了しました。Stripeの確認後、ステータスが更新されます。"
            : "Payment completed. The status will update after Stripe confirms it."}
        </div>
      ) : null}
      <Card className="border-blue-100 bg-white">
        <CardHeader>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {copy.clientDashboardTitle}
          </h1>
          <CardDescription>{copy.clientDashboardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {copy.clientDashboardBody}
        </CardContent>
      </Card>

      {/* LINE deferred until a future release.
      <LineConnectionCard
        locale={locale}
        role="client"
        connected={Boolean(lineConnection)}
        enabled={lineConnection?.notificationEnabled}
        copy={{
          title: copy.lineClientTitle,
          description: copy.lineClientDescription,
          email: copy.lineEmail,
          enabled: copy.lineEnabled,
          line: copy.lineLabel,
          connected: copy.lineConnected,
          notConnected: copy.lineNotConnected,
          connect: copy.lineConnect,
          disconnect: copy.lineDisconnect,
          enable: copy.lineEnable,
          disable: copy.lineDisable,
        }}
      />
      */}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.subscriptionActiveTitle}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {subscriptions.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.sessionBookingHistoryTitle}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {bookingCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{copy.subscriptionActiveTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.length ? (
            subscriptions.map((subscription) => (
              <article
                key={subscription.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <p className="font-semibold">{subscription.planName}</p>
                <p className="text-muted-foreground">
                  {subscription.trainerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {copy.subscriptionStartedAt}: {subscription.startedAt}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.subscriptionNoActivePlans}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.sessionBookingHistoryTitle}</CardTitle>
          <CardDescription>{copy.sessionBookingDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.length ? (
            bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <Link
                  className="font-semibold text-blue-700 underline"
                  href={`/${locale}/dashboard/bookings/${booking.id}`}
                >
                  {locale === "ja"
                    ? booking.sessionOffering.titleJa ||
                      booking.sessionOffering.titleEn
                    : booking.sessionOffering.titleEn}
                </Link>
                <p className="text-muted-foreground">
                  {booking.trainer.profile?.displayName ||
                    booking.trainer.email ||
                    "Trainer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(
                    locale === "ja" ? "ja-JP" : "en-US",
                    { dateStyle: "medium", timeStyle: "short" },
                  ).format(booking.startsAt)}{" "}
                  · {booking.status}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.sessionBookingNoHistory}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
