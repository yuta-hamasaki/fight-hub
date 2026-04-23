import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { getPrismaClient } from "@/lib/prisma";
import { getAccessiblePremiumPosts, getActiveSubscriptions } from "@/lib/subscriptions";

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }

  const prisma = getPrismaClient();
  const [subscriptions, premiumPosts, bookings] = await Promise.all([
    getActiveSubscriptions(user.id, locale),
    getAccessiblePremiumPosts(user.id, locale),
    prisma.booking.findMany({
      where: { clientId: user.id },
      include: {
        trainer: { include: { profile: true } },
        sessionOffering: true,
      },
      orderBy: { startsAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 bg-white">
        <CardHeader>
          <CardTitle>{copy.clientDashboardTitle}</CardTitle>
          <CardDescription>{copy.clientDashboardDescription}</CardDescription>
        </CardHeader>
        <CardContent>{copy.clientDashboardBody}</CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.subscriptionActiveTitle}</CardDescription>
            <CardTitle className="text-xl">{subscriptions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.sessionBookingHistoryTitle}</CardDescription>
            <CardTitle className="text-xl">{bookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardPurchasedContent}</CardDescription>
            <CardTitle className="text-xl">{premiumPosts.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{copy.subscriptionActiveTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subscriptions.length ? (
            subscriptions.map((subscription) => (
              <article key={subscription.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{subscription.planName}</p>
                <p className="text-muted-foreground">{subscription.trainerName}</p>
                <p className="text-xs text-muted-foreground">{copy.subscriptionStartedAt}: {subscription.startedAt}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{copy.subscriptionNoActivePlans}</p>
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
              <article key={booking.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{locale === "ja" ? booking.sessionOffering.titleJa || booking.sessionOffering.titleEn : booking.sessionOffering.titleEn}</p>
                <p className="text-muted-foreground">{booking.trainer.profile?.displayName || booking.trainer.email || "Trainer"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startsAt)} · {booking.status}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{copy.sessionBookingNoHistory}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.subscriptionPremiumContent}</CardTitle>
          <CardDescription>
            <Link href={`/${locale}/dashboard/client/content`} className="underline">
              {copy.clientPremiumOpenList}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {premiumPosts.length ? (
            premiumPosts.map((post) => (
              <article key={post.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{post.title}</p>
                <p className="text-muted-foreground">{post.body}</p>
                <p className="text-xs text-muted-foreground">{post.trainerName} · {post.publishedAt}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{copy.subscriptionNoPremiumPosts}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
