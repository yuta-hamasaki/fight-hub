import Link from "next/link";
import { redirect } from "next/navigation";

import { TrainerProfileForm } from "@/components/forms/trainer-profile/trainer-profile-form";
import { SubscriptionPlanManager } from "@/components/forms/subscription-plan/subscription-plan-manager";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { LineConnectionCard } from "@/components/line/line-connection-card";

import { saveTrainerProfile } from "./actions";
import { saveSessionOffering, updateBookingStatus } from "./session-actions";
import { decodeDescription } from "./session-utils";
import { INITIAL_SUBSCRIPTION_PLAN_STATE } from "./subscription-plan-types";
import {
  saveSubscriptionPlan,
  setPlanPublishStatus,
} from "./subscription-actions";
import { deleteAvailability, saveAvailability } from "./availability-actions";

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

  const [
    profile,
    trainerProfile,
    categories,
    plans,
    offerings,
    bookings,
    contentCount,
    stripeAccount,
    availability,
    lineConnection,
  ] = await Promise.all([
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
    prisma.sessionOffering.findMany({
      where: { trainerUserId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.booking.findMany({
      where: {
        trainerId: user.id,
        startsAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        client: { include: { profile: true } },
        sessionOffering: true,
      },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.contentPost.count({ where: { authorId: user.id, isPremium: true } }),
    prisma.stripeAccount.findUnique({ where: { userId: user.id } }),
    prisma.trainerAvailability.findMany({
      where: { trainerId: user.id, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    }),
    prisma.lineConnection.findUnique({ where: { userId: user.id } }),
  ]);

  const now = new Date();
  const [bookingStats, upcomingCount] = await Promise.all([
    prisma.booking.groupBy({
      by: ["status"],
      where: { trainerId: user.id },
      _count: { _all: true },
      _sum: { amountPaid: true },
    }),
    prisma.booking.count({
      where: {
        trainerId: user.id,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
  ]);
  const onboardingComplete = Boolean(
    stripeAccount?.detailsSubmitted &&
    stripeAccount?.chargesEnabled &&
    stripeAccount?.payoutsEnabled,
  );
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
  const activeOfferingCount = offerings.filter(
    (offering) => offering.isActive,
  ).length;
  const totalOfferingCount = offerings.length;
  const pendingBookingCount =
    bookingStats.find((b) => b.status === "PENDING")?._count._all ?? 0;
  const upcomingBookingCount = upcomingCount;
  const completedBookingCount =
    bookingStats.find((b) => b.status === "COMPLETED")?._count._all ?? 0;
  const estimatedEarnings = Number(
    bookingStats.find((b) => b.status === "COMPLETED")?._sum.amountPaid ?? 0,
  );

  return (
    <div className="space-y-6">
      <nav
        aria-label={
          locale === "ja" ? "このページの設定" : "Settings on this page"
        }
        className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3"
      >
        {[
          ["sessions", "レッスン", "Sessions"],
          ["plans", "月額プラン", "Plans"],
          ["profile", "プロフィール", "Profile"],
        ].map(([id, ja, en]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            {locale === "ja" ? ja : en}
          </a>
        ))}
      </nav>

      <Card className="border-blue-100 bg-white">
        <CardHeader>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {copy.trainerDashboardTitle}
          </h1>
          <CardDescription>{copy.trainerDashboardDescription}</CardDescription>
        </CardHeader>
      </Card>

      <LineConnectionCard
        locale={locale}
        role="trainer"
        connected={Boolean(lineConnection)}
        enabled={lineConnection?.notificationEnabled}
        copy={{
          title: copy.lineTrainerTitle,
          description: copy.lineTrainerDescription,
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

      <Link
        className="text-blue-700 underline"
        href={`/${locale}/dashboard/workspace?tab=settings`}
      >
        {locale === "ja"
          ? "予約ルール・休業日・体験設定"
          : "Booking rules, closures and trials"}
      </Link>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardProfileCompletion}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {profileCompletionRatio}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {profileCompleted
                ? copy.dashboardComplete
                : copy.dashboardIncomplete}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardStripeStatus}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {onboardingComplete
                ? copy.dashboardComplete
                : copy.dashboardIncomplete}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {stripeAccount?.detailsSubmitted
                ? copy.trainerStripeDetailSubmitted
                : copy.dashboardIncomplete}{" "}
              ·{" "}
              {stripeAccount?.chargesEnabled
                ? copy.trainerStripeChargesEnabled
                : copy.dashboardIncomplete}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>
              {copy.dashboardSubscriptionSummary}
            </CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {activePlanCount} {copy.dashboardActiveLabel}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalPlanCount} {copy.dashboardTotalLabel}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardContentSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {contentCount} {copy.dashboardPremiumPostsLabel}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {activeOfferingCount}/{totalOfferingCount}{" "}
              {copy.dashboardActiveOfferingsLabel}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardBookingSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {upcomingBookingCount} {copy.dashboardUpcoming}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {pendingBookingCount} {copy.dashboardPending} ·{" "}
              {completedBookingCount} {copy.dashboardCompletedLabel}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-blue-100">
          <CardHeader>
            <CardDescription>{copy.dashboardEarningsSummary}</CardDescription>
            <CardTitle className="text-xl text-blue-700">
              {copy.dashboardEstimated}: {asMoney(estimatedEarnings, locale)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {completedBookingCount} {copy.dashboardCompletedLabel}{" "}
              {copy.dashboardBookingsLabel}
            </p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "ja"
              ? "売上受取・銀行口座設定"
              : "Payout and bank settings"}
          </CardTitle>
          <CardDescription>
            {locale === "ja"
              ? "Stripeで本人確認、銀行口座、入金設定を管理します。"
              : "Manage identity, bank account, and payout settings securely in Stripe."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/dashboard/trainer/revenue`}
            className={buttonVariants({ variant: "default" })}
          >
            {locale === "ja"
              ? "収益ダッシュボードを開く"
              : "Open revenue dashboard"}
          </Link>
          <Link
            href={`/${locale}/trainer/dashboard/stripe`}
            className={buttonVariants({ variant: "outline" })}
          >
            {locale === "ja" ? "Stripe設定を開く" : "Open Stripe settings"}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "ja" ? "予約受付時間" : "Booking availability"}
          </CardTitle>
          <CardDescription>
            {locale === "ja"
              ? "UTC基準の簡易設定です。未設定の曜日は受付しません。現地時間・休業日は予約設定で管理できます。"
              : "Quick UTC settings. Days without hours are closed. Use booking settings for local times and closures."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={saveAvailability.bind(null, locale)}
            className="grid gap-2 sm:grid-cols-4"
          >
            <label className="grid gap-2 text-sm font-medium">
              <span>{locale === "ja" ? "曜日（UTC）" : "Day (UTC)"}</span>
              <select
                name="dayOfWeek"
                className="rounded-md border px-3 py-2 text-sm"
              >
                {(locale === "ja"
                  ? ["日", "月", "火", "水", "木", "金", "土"]
                  : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                ).map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {locale === "ja" ? "開始時刻（UTC）" : "Start time (UTC)"}
              </span>
              <input
                name="startTime"
                type="time"
                required
                className="rounded-md border px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {locale === "ja" ? "終了時刻（UTC）" : "End time (UTC)"}
              </span>
              <input
                name="endTime"
                type="time"
                required
                className="rounded-md border px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit">
              {locale === "ja" ? "受付時間を追加" : "Add hours"}
            </Button>
          </form>
          <div className="space-y-2">
            {availability.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span>
                  {
                    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                      rule.dayOfWeek
                    ]
                  }{" "}
                  · {String(Math.floor(rule.startMinute / 60)).padStart(2, "0")}
                  :{String(rule.startMinute % 60).padStart(2, "0")}–
                  {String(Math.floor(rule.endMinute / 60)).padStart(2, "0")}:
                  {String(rule.endMinute % 60).padStart(2, "0")} UTC
                </span>
                <form action={deleteAvailability.bind(null, locale)}>
                  <input type="hidden" name="availabilityId" value={rule.id} />
                  <Button type="submit" size="sm" variant="outline">
                    {locale === "ja" ? "削除" : "Remove"}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.premiumContentManageTitle}</CardTitle>
          <CardDescription>
            {copy.premiumContentManageDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/${locale}/dashboard/trainer/content`}
            className={buttonVariants({ variant: "default" })}
          >
            {copy.premiumContentOpenManager}
          </Link>
        </CardContent>
      </Card>

      <Card id="sessions">
        <CardHeader>
          <CardTitle>{copy.sessionManageTitle}</CardTitle>
          <CardDescription>{copy.sessionManageDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={saveSessionOffering.bind(null, locale)}
            className="grid gap-3 md:grid-cols-2"
          >
            <input type="hidden" name="offeringId" value="" />
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {copy.sessionTitleEn}{" "}
                <span className="text-red-700" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                name="titleEn"

                className="rounded-md border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.sessionTitleJa}</span>
              <input
                name="titleJa"

                className="rounded-md border px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {copy.sessionDurationMinutes}{" "}
                <span className="text-red-700" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                name="durationMinutes"
                type="number"
                min={15}
                step={15}

                className="rounded-md border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {copy.sessionPrice}{" "}
                <span className="text-red-700" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                name="price"
                type="number"
                min={1}
                step="0.01"

                className="rounded-md border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{locale === "ja" ? "指導形式" : "Session format"}</span>
              <select
                name="format"
                defaultValue="online"
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="online">{copy.sessionFormatOnline}</option>
                <option value="in_person">{copy.sessionFormatInPerson}</option>
                <option value="hybrid">{copy.sessionFormatHybrid}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked />
              {copy.commonPublish}
            </label>
            <label className="grid gap-2 text-sm font-medium md:col-span-2">
              <span>{copy.sessionDescriptionEn}</span>
              <textarea
                name="descriptionEn"

                className="min-h-24 rounded-md border px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium md:col-span-2">
              <span>{copy.sessionDescriptionJa}</span>
              <textarea
                name="descriptionJa"

                className="min-h-24 rounded-md border px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit" className="md:col-span-2 w-fit">
              {copy.sessionCreate}
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-sm font-medium">
              {copy.sessionCurrentOfferings} ({activeOfferingCount})
            </p>
            {offerings.length ? (
              offerings.map((offering) => {
                const localizedDescription =
                  locale === "ja"
                    ? offering.descriptionJa
                    : offering.descriptionEn;
                const fallbackDescription =
                  locale === "ja"
                    ? offering.descriptionEn
                    : offering.descriptionJa;
                const parsed = decodeDescription(localizedDescription);
                const fallback = decodeDescription(fallbackDescription);
                const format = parsed.format || fallback.format;

                return (
                  <details
                    key={offering.id}
                    className="rounded-md border border-blue-100 p-3"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {(locale === "ja"
                        ? offering.titleJa
                        : offering.titleEn) || offering.titleEn}{" "}
                      · {offering.durationMinutes}m ·{" "}
                      {asMoney(Number(offering.price), locale)} · {format}
                    </summary>
                    <form
                      action={saveSessionOffering.bind(null, locale)}
                      className="mt-3 grid gap-3 md:grid-cols-2"
                    >
                      <input
                        type="hidden"
                        name="offeringId"
                        value={offering.id}
                      />
                      <label className="grid gap-2 text-sm font-medium">
                        <span>
                          {copy.sessionTitleEn}{" "}
                          <span className="text-red-700" aria-hidden="true">
                            *
                          </span>
                        </span>
                        <input
                          name="titleEn"
                          defaultValue={offering.titleEn}

                          className="rounded-md border px-3 py-2 text-sm"
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        <span>{copy.sessionTitleJa}</span>
                        <input
                          name="titleJa"
                          defaultValue={offering.titleJa ?? ""}

                          className="rounded-md border px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        <span>
                          {copy.sessionDurationMinutes}{" "}
                          <span className="text-red-700" aria-hidden="true">
                            *
                          </span>
                        </span>
                        <input
                          name="durationMinutes"
                          type="number"
                          min={15}
                          step={15}
                          defaultValue={offering.durationMinutes}

                          className="rounded-md border px-3 py-2 text-sm"
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        <span>
                          {copy.sessionPrice}{" "}
                          <span className="text-red-700" aria-hidden="true">
                            *
                          </span>
                        </span>
                        <input
                          name="price"
                          type="number"
                          min={1}
                          step="0.01"
                          defaultValue={offering.price.toString()}

                          className="rounded-md border px-3 py-2 text-sm"
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        <span>
                          {locale === "ja" ? "指導形式" : "Session format"}
                        </span>
                        <select
                          name="format"
                          defaultValue={format}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          <option value="online">
                            {copy.sessionFormatOnline}
                          </option>
                          <option value="in_person">
                            {copy.sessionFormatInPerson}
                          </option>
                          <option value="hybrid">
                            {copy.sessionFormatHybrid}
                          </option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={offering.isActive}
                        />
                        {copy.commonPublish}
                      </label>
                      <label className="grid gap-2 text-sm font-medium md:col-span-2">
                        <span>{copy.sessionDescriptionEn}</span>
                        <textarea
                          name="descriptionEn"
                          defaultValue={
                            decodeDescription(offering.descriptionEn)
                              .description
                          }

                          className="min-h-24 rounded-md border px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium md:col-span-2">
                        <span>{copy.sessionDescriptionJa}</span>
                        <textarea
                          name="descriptionJa"
                          defaultValue={
                            decodeDescription(offering.descriptionJa)
                              .description
                          }

                          className="min-h-24 rounded-md border px-3 py-2 text-sm"
                        />
                      </label>
                      <Button
                        type="submit"
                        variant="outline"
                        className="md:col-span-2 w-fit"
                      >
                        {copy.sessionSave}
                      </Button>
                    </form>
                  </details>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                {copy.sessionNoOfferingsYet}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div id="plans">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.sessionTrainerBookingsTitle}</CardTitle>
          <CardDescription>
            {copy.sessionTrainerBookingsDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.length ? (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-md border border-blue-100 p-3 text-sm"
              >
                <Link
                  className="font-semibold text-blue-700 underline"
                  href={`/${locale}/dashboard/bookings/${booking.id}`}
                >
                  {booking.sessionOffering.titleEn}
                </Link>
                <p className="text-muted-foreground">
                  {booking.client.profile?.displayName ||
                    booking.client.email ||
                    "Client"}{" "}
                  ·{" "}
                  {new Intl.DateTimeFormat(
                    locale === "ja" ? "ja-JP" : "en-US",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  ).format(booking.startsAt)}
                </p>
                <form
                  action={updateBookingStatus.bind(null, locale)}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <label className="grid gap-2 text-sm font-medium">
                    <span>
                      {locale === "ja" ? "予約の状態" : "Booking status"}
                    </span>
                    <select
                      name="status"
                      defaultValue={booking.status}
                      className="rounded-md border px-2 py-1"
                    >
                      <option value="PENDING" disabled>
                        {copy.sessionStatusPending}
                      </option>
                      <option value="CONFIRMED" disabled>
                        {copy.sessionStatusConfirmed}
                      </option>
                      <option value="COMPLETED" disabled>
                        {copy.sessionStatusCompleted}
                      </option>
                      <option value="CANCELED">
                        {copy.sessionStatusCanceled}
                      </option>
                    </select>
                  </label>
                  <Button type="submit" size="sm" variant="outline">
                    {copy.commonUpdate}
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.sessionBookingNoHistory}
            </p>
          )}
        </CardContent>
      </Card>

      <div id="profile">
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
            publishProfile: copy.trainerProfilePublishLabel,
            publishProfileHelp: copy.trainerProfilePublishHelp,
          }}
          initialValues={{
            displayName: profile?.displayName ?? "",
            displayNameJa: profile?.displayNameJa ?? "",
            profileImageUrl: trainerProfile?.profileImageUrl ?? "",
            shortBio: trainerProfile?.shortBio ?? profile?.bio ?? "",
            shortBioJa: trainerProfile?.shortBioJa ?? profile?.bioJa ?? "",
            longBio: trainerProfile?.longBio ?? "",
            longBioJa: trainerProfile?.longBioJa ?? "",
            categories: categories.map(
              (category: { labelEn: string }) => category.labelEn,
            ),
            languages: toStringArray(trainerProfile?.languages),
            achievements: toStringArray(trainerProfile?.achievements),
            certifications: toStringArray(trainerProfile?.certifications),
            coachingFormats: toStringArray(trainerProfile?.coachingFormats),
            socialWebsite: toSocialValue(
              trainerProfile?.socialLinks,
              "website",
            ),
            socialInstagram: toSocialValue(
              trainerProfile?.socialLinks,
              "instagram",
            ),
            socialX: toSocialValue(trainerProfile?.socialLinks, "x"),
            socialYoutube: toSocialValue(
              trainerProfile?.socialLinks,
              "youtube",
            ),
            isPublished: trainerProfile?.isPublished ?? false,
          }}
          initialState={{ status: "idle", message: "", fieldErrors: {} }}
          action={saveTrainerProfile.bind(null, locale)}
        />
      </div>
    </div>
  );
}
