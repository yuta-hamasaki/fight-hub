import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { requireDbUser } from "@/lib/auth/session";
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

  const [subscriptions, premiumPosts] = await Promise.all([
    getActiveSubscriptions(user.id, locale),
    getAccessiblePremiumPosts(user.id, locale),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{copy.clientDashboardTitle}</CardTitle>
          <CardDescription>{copy.clientDashboardDescription}</CardDescription>
        </CardHeader>
        <CardContent>{copy.clientDashboardBody}</CardContent>
      </Card>

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
