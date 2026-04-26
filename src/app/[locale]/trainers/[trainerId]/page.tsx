import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PurchaseSubscriptionButton } from "@/components/subscriptions/purchase-subscription-button";
import { SessionBookingForm } from "@/components/bookings/session-booking-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscriptionForTrainer } from "@/lib/subscriptions";
import { getTrainerDetail } from "@/lib/trainers";
import { createBooking } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; trainerId: string }>;
}): Promise<Metadata> {
  const { locale, trainerId } = await params;
  const copy = dictionary[locale];
  const trainer = await getTrainerDetail(locale, trainerId);

  if (!trainer) {
    return {
      title: copy.trainerDetailsNotFound,
    };
  }

  return {
    title: `${trainer.name} · ${copy.trainerDiscoveryTitle}`,
    description: trainer.bio || copy.trainerDiscoveryDescription,
  };
}

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; trainerId: string }>;
}) {
  const { locale, trainerId } = await params;
  const copy = dictionary[locale];
  const trainer = await getTrainerDetail(locale, trainerId);

  if (!trainer) {
    notFound();
  }

  const { userId } = await auth();
  const dbUser = userId
    ? ((await prisma.user.findUnique({
        where: { clerkUserId: userId },
        select: { id: true, role: true },
      })) as { id: string; role: string } | null)
    : null;
  const canPurchase = dbUser?.role === "CLIENT";
  const hasAccess = dbUser
    ? await hasActiveSubscriptionForTrainer(dbUser.id, trainerId)
    : false;
  const formatLabel = (format: string) =>
    format === "in_person"
      ? copy.sessionFormatInPerson
      : format === "hybrid"
        ? copy.sessionFormatHybrid
        : copy.sessionFormatOnline;

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/trainers`} className="text-sm font-medium underline-offset-4 hover:underline">
        {copy.trainerBackToList}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Image src={trainer.image} alt={trainer.name} width={80} height={80} className="size-20 rounded-full border border-border object-cover" unoptimized />
            <div className="space-y-1">
              <CardTitle className="text-2xl">{trainer.name}</CardTitle>
              <CardDescription>{trainer.headline || copy.trainerDefaultHeadline}</CardDescription>
              <p className="text-sm text-muted-foreground">
                {trainer.rating ? `${trainer.rating.toFixed(1)} ★` : "New"} · {trainer.reviewCount} reviews
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{trainer.bio || copy.trainerDefaultBio}</p>
          <p className="text-sm">
            <span className="font-semibold">{copy.trainerLanguages}:</span> {trainer.languages.join(" / ")}
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{copy.trainerCategories}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trainer.categories.length ? (
                trainer.categories.map((category) => (
                  <span key={category} className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                    {category}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{copy.trainerNoCategories}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.trainerAchievements}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {trainer.achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{copy.trainerSessionOfferings}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainer.sessionOfferings.length ? (
              trainer.sessionOfferings.map((offering) => (
                <div key={offering.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{offering.title}</p>
                  <p className="text-sm text-muted-foreground">{offering.description || copy.trainerNoDescription}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {offering.durationMinutes} min · {offering.price} · {copy.sessionFormat}: {formatLabel(offering.format)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{copy.trainerNoSessions}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.trainerSubscriptionPlans}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainer.subscriptionPlans.length ? (
              trainer.subscriptionPlans.map((plan) => (
                <div key={plan.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.description || copy.trainerNoDescription}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{plan.priceMonthly} / month</p>
                    {canPurchase ? <PurchaseSubscriptionButton locale={locale} planId={plan.id} label={copy.subscriptionBuyNow} /> : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{copy.trainerNoPlans}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{copy.subscriptionPremiumContent}</CardTitle>
          <CardDescription>{hasAccess ? copy.subscriptionPremiumGranted : copy.subscriptionPremiumLocked}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasAccess ? (
            trainer.premiumPosts.length ? (
              trainer.premiumPosts.map((post) => (
                <article key={post.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{post.title}</p>
                  <p className="text-sm text-muted-foreground">{post.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{post.publishedAt}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{copy.subscriptionNoPremiumPosts}</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">{copy.subscriptionPremiumLockedBody}</p>
          )}
        </CardContent>
      </Card>
      {canPurchase && trainer.sessionOfferings.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{copy.sessionBookingTitle}</CardTitle>
            <CardDescription>{copy.sessionBookingDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionBookingForm
              offerings={trainer.sessionOfferings}
              action={createBooking.bind(null, locale, trainer.id)}
              copy={{
                button: copy.sessionBookButton,
                startsAt: copy.sessionStartsAt,
                timezone: copy.sessionTimezone,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{copy.trainerReviews}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainer.reviews.length ? (
              trainer.reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{review.title || `${review.rating} ★`}</p>
                  <p className="text-sm text-muted-foreground">{review.comment || copy.trainerNoReviewBody}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {review.reviewerName} · {review.createdAt}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{copy.trainerNoReviews}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.trainerExternalLinks}</CardTitle>
          </CardHeader>
          <CardContent>
            {trainer.externalLinks.length ? (
              <ul className="space-y-2">
                {trainer.externalLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.trainerNoExternalLinks}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
