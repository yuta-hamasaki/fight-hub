import { redirect } from "next/navigation";

import { SubscriptionPlanManager } from "@/components/forms/subscription-plan/subscription-plan-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { PLATFORM_FEE_BPS } from "@/lib/billing/fees";
import { getTrainerStripeOnboardingStatus } from "@/lib/stripe/connect";

import { refreshTrainerStripeStatus, startTrainerStripeOnboarding } from "./actions";
import { TrainerProfileForm } from "@/components/forms/trainer-profile/trainer-profile-form";
import type { TrainerProfileFormValues } from "@/components/forms/trainer-profile/types";
import { Card, CardContent } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { getPrismaClient } from "@/lib/prisma";

import { saveTrainerProfile } from "./actions";
import { saveSubscriptionPlan, setPlanPublishStatus } from "./subscription-actions";
import { INITIAL_SUBSCRIPTION_PLAN_STATE } from "./subscription-plan-types";

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

export default async function TrainerDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);
  const prisma = getPrismaClient();

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const [profile, trainerProfile, categories, plans] = await Promise.all([
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
  ]);

  const initialValues: TrainerProfileFormValues = {
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
  };

  return (
    <Card>
      <CardContent className="pt-6">

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
          initialValues={initialValues}
          initialState={{ status: "idle", message: "", fieldErrors: {} }}
          action={saveTrainerProfile.bind(null, locale)}
        />
      </CardContent>
    </Card>
  );
}
