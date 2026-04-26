import Link from "next/link";
import { redirect } from "next/navigation";

import { TrainerProfileForm } from "@/components/forms/trainer-profile/trainer-profile-form";
import { SubscriptionPlanManager } from "@/components/forms/subscription-plan/subscription-plan-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { prisma } from "@/lib/prisma";

import { saveTrainerProfile } from "./actions";
import { decodeDescription, saveSessionOffering, updateBookingStatus } from "./session-actions";
import { INITIAL_SUBSCRIPTION_PLAN_STATE } from "./subscription-plan-types";
import { saveSubscriptionPlan, setPlanPublishStatus } from "./subscription-actions";

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toSocialValue(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : "";
}

function asMoney(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function TrainerDashboardPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);
  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const [profile, trainerProfile, categories, plans, offerings, bookings, contentCount, stripeAccount] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.trainerProfile.findUnique({ where: { userId: user.id } }),
    prisma.trainerCategory.findMany({
      where: { trainerProfile: { userId: user.id } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subscriptionPlan.findMany({
      where: { trainerProfile: { userId: user.id } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.sessionOffering.findMany({ where: { trainerUserId: user.id }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.booking.findMany({
      where: { trainerId: user.id },
      include: { client: { include: { profile: true } }, sessionOffering: true },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.contentPost.count({ where: { authorId: user.id, isPremium: true } }),
    prisma.stripeAccount.findUnique({ where: { userId: user.id } }),
  ]);

  const now = new Date();
  const onboardingComplete = Boolean(stripeAccount?.detailsSubmitted && stripeAccount?.chargesEnabled && stripeAccount?.payoutsEnabled);
  const profileChecklist = [
    Boolean(profile?.displayName),
    Boolean(trainerProfile?.shortBio),
    categories.length > 0,
    toStringArray(trainerProfile?.coachingFormats).length > 0,
  ];
  const profileCompletionRatio = `${profileChecklist.filter(Boolean).length}/${profileChecklist.length}`;
  const profileCompleted = profileChecklist.every(Boolean);
  const activePlanCount = plans.filter((plan) => plan.isActive).length;
  const totalPlanCount = plans.length;
  const activeOfferingCount = offerings.filter((offering) => offering.isActive).length;
  const totalOfferingCount = offerings.length;
  const pendingBookingCount = bookings.filter((booking) => booking.status === "PENDING").length;
  const upcomingBookingCount = bookings.filter((booking) => booking.startsAt >= now && booking.status !== "CANCELED").length;
  const completedBookingCount = bookings.filter((booking) => booking.status === "COMPLETED").length;
  const estimatedEarnings = bookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + Number(booking.sessionOffering.price), 0);

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 bg-white">
        <CardHeader>
          <CardTitle>{copy.trainerDashboardTitle}</CardTitle>
          <CardDescription>{copy.trainerDashboardDescription}</CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardProfileCompletion}</CardDescription>
            <CardTitle className="text-xl text-blue-700">{profileCompletionRatio}</CardTitle>
            <p className="text-sm text-muted-foreground">{profileCompleted ? copy.dashboardComplete : copy.dashboardIncomplete}</p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardStripeStatus}</CardDescription>
            <CardTitle className="text-xl text-blue-700">{onboardingComplete ? copy.dashboardComplete : copy.dashboardIncomplete}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {stripeAccount?.detailsSubmitted ? copy.trainerStripeDetailSubmitted : copy.dashboardIncomplete} ·{" "}
              {stripeAccount?.chargesEnabled ? copy.trainerStripeChargesEnabled : copy.dashboardIncomplete}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardSubscriptionSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">{activePlanCount} {copy.dashboardActiveLabel}</CardTitle>
            <p className="text-sm text-muted-foreground">{totalPlanCount} {copy.dashboardTotalLabel}</p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardContentSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">{contentCount} {copy.dashboardPremiumPostsLabel}</CardTitle>
            <p className="text-sm text-muted-foreground">{activeOfferingCount}/{totalOfferingCount} {copy.dashboardActiveOfferingsLabel}</p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardBookingSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">{upcomingBookingCount} {copy.dashboardUpcoming}</CardTitle>
            <p className="text-sm text-muted-foreground">{pendingBookingCount} {copy.dashboardPending} · {completedBookingCount} {copy.dashboardCompletedLabel}</p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardEarningsSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">{copy.dashboardEstimated}: {asMoney(estimatedEarnings, locale)}</CardTitle>
            <p className="text-sm text-muted-foreground">{completedBookingCount} {copy.dashboardCompletedLabel} {copy.dashboardBookingsLabel}</p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{copy.premiumContentManageTitle}</CardTitle>
          <CardDescription>{copy.premiumContentManageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/${locale}/dashboard/trainer/content`}>{copy.premiumContentOpenManager}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.sessionManageTitle}</CardTitle>
          <CardDescription>{copy.sessionManageDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={saveSessionOffering.bind(null, locale)} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="offeringId" value="" />
            <input name="titleEn" placeholder={copy.sessionTitleEn} className="rounded-md border px-3 py-2 text-sm" required />
            <input name="titleJa" placeholder={copy.sessionTitleJa} className="rounded-md border px-3 py-2 text-sm" />
            <input name="durationMinutes" type="number" min={15} step={15} placeholder={copy.sessionDurationMinutes} className="rounded-md border px-3 py-2 text-sm" required />
            <input name="price" type="number" min={1} step="0.01" placeholder={copy.sessionPrice} className="rounded-md border px-3 py-2 text-sm" required />
            <select name="format" defaultValue="online" className="rounded-md border px-3 py-2 text-sm">
              <option value="online">{copy.sessionFormatOnline}</option>
              <option value="in_person">{copy.sessionFormatInPerson}</option>
              <option value="hybrid">{copy.sessionFormatHybrid}</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked />{copy.commonPublish}</label>
            <textarea name="descriptionEn" placeholder={copy.sessionDescriptionEn} className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" />
            <textarea name="descriptionJa" placeholder={copy.sessionDescriptionJa} className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" />
            <Button type="submit" className="md:col-span-2 w-fit">{copy.sessionCreate}</Button>
          </form>

          <div className="space-y-3">
            <p className="text-sm font-medium">{copy.sessionCurrentOfferings} ({activeOfferingCount})</p>
            {offerings.length ? offerings.map((offering) => {
              const localizedDescription = locale === "ja" ? offering.descriptionJa : offering.descriptionEn;
              const fallbackDescription = locale === "ja" ? offering.descriptionEn : offering.descriptionJa;
              const parsed = decodeDescription(localizedDescription);
              const fallback = decodeDescription(fallbackDescription);
              const format = parsed.format || fallback.format;

              return (
                <details key={offering.id} className="rounded-md border border-blue-100 p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {(locale === "ja" ? offering.titleJa : offering.titleEn) || offering.titleEn} · {offering.durationMinutes}m · {asMoney(Number(offering.price), locale)} · {format}
                  </summary>
                  <form action={saveSessionOffering.bind(null, locale)} className="mt-3 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="offeringId" value={offering.id} />
                    <input name="titleEn" defaultValue={offering.titleEn} placeholder={copy.sessionTitleEn} className="rounded-md border px-3 py-2 text-sm" required />
                    <input name="titleJa" defaultValue={offering.titleJa ?? ""} placeholder={copy.sessionTitleJa} className="rounded-md border px-3 py-2 text-sm" />
                    <input name="durationMinutes" type="number" min={15} step={15} defaultValue={offering.durationMinutes} placeholder={copy.sessionDurationMinutes} className="rounded-md border px-3 py-2 text-sm" required />
                    <input name="price" type="number" min={1} step="0.01" defaultValue={offering.price.toString()} placeholder={copy.sessionPrice} className="rounded-md border px-3 py-2 text-sm" required />
                    <select name="format" defaultValue={format} className="rounded-md border px-3 py-2 text-sm">
                      <option value="online">{copy.sessionFormatOnline}</option>
                      <option value="in_person">{copy.sessionFormatInPerson}</option>
                      <option value="hybrid">{copy.sessionFormatHybrid}</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={offering.isActive} />{copy.commonPublish}</label>
                    <textarea name="descriptionEn" defaultValue={decodeDescription(offering.descriptionEn).description} placeholder={copy.sessionDescriptionEn} className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" />
                    <textarea name="descriptionJa" defaultValue={decodeDescription(offering.descriptionJa).description} placeholder={copy.sessionDescriptionJa} className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" />
                    <Button type="submit" variant="outline" className="md:col-span-2 w-fit">{copy.sessionSave}</Button>
                  </form>
                </details>
              );
            }) : <p className="text-sm text-muted-foreground">{copy.sessionNoOfferingsYet}</p>}
          </div>
        </CardContent>
      </Card>

      <SubscriptionPlanManager
        locale={locale}
        copy={{
          title: copy.subscriptionManageTitle,
          description: copy.subscriptionManageDescription,
          save: copy.subscriptionSavePlan,
          createNew: copy.subscriptionCreateNew,
          active: copy.subscriptionStatusActive,
          inactive: copy.subscriptionStatusInactive,
          nameEn: copy.subscriptionNameEn,
          nameJa: copy.subscriptionNameJa,
          price: copy.subscriptionPriceMonthly,
          descriptionEn: copy.subscriptionDescriptionEn,
          descriptionJa: copy.subscriptionDescriptionJa,
          publish: copy.subscriptionPublishLabel,
          planList: copy.subscriptionCurrentPlans,
        }}
        plans={plans}
        initialState={INITIAL_SUBSCRIPTION_PLAN_STATE}
        action={saveSubscriptionPlan.bind(null, locale)}
        onToggle={setPlanPublishStatus.bind(null, locale)}
      />

      <Card>
        <CardHeader>
          <CardTitle>{copy.sessionTrainerBookingsTitle}</CardTitle>
          <CardDescription>{copy.sessionTrainerBookingsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.length ? bookings.map((booking) => (
            <div key={booking.id} className="rounded-md border border-blue-100 p-3 text-sm">
              <p className="font-semibold">{booking.sessionOffering.titleEn}</p>
              <p className="text-muted-foreground">
                {(booking.client.profile?.displayName || booking.client.email || "Client")} · {new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(booking.startsAt)}
              </p>
              <form action={updateBookingStatus.bind(null, locale)} className="mt-2 flex flex-wrap items-center gap-2">
                <input type="hidden" name="bookingId" value={booking.id} />
                <select name="status" defaultValue={booking.status} className="rounded-md border px-2 py-1">
                  <option value="PENDING">{copy.sessionStatusPending}</option>
                  <option value="CONFIRMED">{copy.sessionStatusConfirmed}</option>
                  <option value="COMPLETED">{copy.sessionStatusCompleted}</option>
                  <option value="CANCELED">{copy.sessionStatusCanceled}</option>
                </select>
                <Button type="submit" size="sm" variant="outline">{copy.commonUpdate}</Button>
              </form>
            </div>
          )) : <p className="text-sm text-muted-foreground">{copy.sessionBookingNoHistory}</p>}
        </CardContent>
      </Card>

      <TrainerProfileForm
        locale={locale}
        copy={{
          title: copy.trainerProfileTitle,
          description: copy.trainerProfileDescription,
          save: copy.saveTrainerProfile,
          saved: copy.trainerProfileSaved,
          formTip: copy.trainerProfileFormTip,
          basicInfo: copy.trainerProfileSectionBasic,
          bios: copy.trainerProfileSectionBio,
          categoriesAndLanguages: copy.trainerProfileSectionCategory,
          credibility: copy.trainerProfileSectionCredibility,
          coaching: copy.trainerProfileSectionCoaching,
          socialLinks: copy.trainerProfileSectionSocial,
        }}
        initialValues={{
          displayName: profile?.displayName ?? "",
          displayNameJa: profile?.displayNameJa ?? "",
          profileImageUrl: trainerProfile?.profileImageUrl ?? "",
          shortBio: trainerProfile?.shortBio ?? profile?.bio ?? "",
          shortBioJa: trainerProfile?.shortBioJa ?? profile?.bioJa ?? "",
          longBio: trainerProfile?.longBio ?? "",
          longBioJa: trainerProfile?.longBioJa ?? "",
          categories: categories.map((category: { labelEn: string }) => category.labelEn),
          languages: toStringArray(trainerProfile?.languages),
          achievements: toStringArray(trainerProfile?.achievements),
          certifications: toStringArray(trainerProfile?.certifications),
          coachingFormats: toStringArray(trainerProfile?.coachingFormats),
          socialWebsite: toSocialValue(trainerProfile?.socialLinks, "website"),
          socialInstagram: toSocialValue(trainerProfile?.socialLinks, "instagram"),
          socialX: toSocialValue(trainerProfile?.socialLinks, "x"),
          socialYoutube: toSocialValue(trainerProfile?.socialLinks, "youtube"),
        }}
        initialState={{ status: "idle", message: "", fieldErrors: {} }}
        action={saveTrainerProfile.bind(null, locale)}
      />
    </div>
  );
}
