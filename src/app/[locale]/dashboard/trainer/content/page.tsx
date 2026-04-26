import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { prisma } from "@/lib/prisma";

import { savePremiumContent, setPremiumContentPublishStatus } from "./actions";

type PremiumContentRecord = {
  id: string;
  contentType: "TEXT" | "YOUTUBE";
  titleEn: string;
  titleJa: string | null;
  summaryEn: string | null;
  summaryJa: string | null;
  bodyEn: string;
  bodyJa: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  accesses: Array<{ subscriptionPlanId: string }>;
};

export default async function TrainerPremiumContentPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  const [plans, contents] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { trainerProfile: { userId: user.id }, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, nameEn: true, nameJa: true },
    }),
    prisma.contentPost.findMany({
      where: { authorId: user.id, isPremium: true },
      include: {
        accesses: {
          select: { subscriptionPlanId: true },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    }) as Promise<PremiumContentRecord[]>,
  ]);

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/dashboard/trainer`} className="text-sm font-medium underline-offset-4 hover:underline">
        ← {copy.dashboard}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{copy.premiumContentManageTitle}</CardTitle>
          <CardDescription>{copy.premiumContentManageDescription}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.premiumContentCreate}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={savePremiumContent.bind(null, locale)} className="grid gap-3">
            <input type="hidden" name="contentId" value="" />
            <select name="contentType" defaultValue="TEXT" className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="TEXT">{copy.premiumContentTypeText}</option>
              <option value="YOUTUBE">{copy.premiumContentTypeYoutube}</option>
            </select>
            <input name="titleEn" placeholder={copy.premiumContentTitleEn} className="rounded-md border bg-background px-3 py-2 text-sm" required />
            <input name="titleJa" placeholder={copy.premiumContentTitleJa} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <input name="summaryEn" placeholder={copy.premiumContentSummaryEn} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <input name="summaryJa" placeholder={copy.premiumContentSummaryJa} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <textarea name="bodyEn" placeholder={copy.premiumContentBodyEn} className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm" required />
            <textarea name="bodyJa" placeholder={copy.premiumContentBodyJa} className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm" />
            <input name="thumbnailUrl" placeholder={copy.premiumContentThumbnailUrl} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <input name="youtubeUrl" placeholder={copy.premiumContentYoutubeUrl} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">{copy.premiumContentAssignPlans}</legend>
              {plans.length ? (
                plans.map((plan) => (
                  <label key={plan.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="planIds" value={plan.id} />
                    {locale === "ja" ? plan.nameJa || plan.nameEn : plan.nameEn || plan.nameJa || "Plan"}
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{copy.subscriptionNoActivePlans}</p>
              )}
            </fieldset>
            <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              {copy.subscriptionSavePlan}
            </button>
          </form>
        </CardContent>
      </Card>

      {contents.map((content) => (
        <Card key={content.id}>
          <CardHeader>
            <CardTitle>{locale === "ja" ? content.titleJa || content.titleEn : content.titleEn || content.titleJa}</CardTitle>
            <CardDescription>{content.summaryEn || content.summaryJa || copy.premiumContentNoSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {content.contentType} · {content.status} · {content.accesses.length} {copy.premiumContentAssignedPlans}
            </div>
            <form action={setPremiumContentPublishStatus.bind(null, locale)} className="inline-flex">
              <input type="hidden" name="contentId" value={content.id} />
              <input type="hidden" name="next" value={content.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
              <button type="submit" className="rounded-md border px-3 py-2 text-sm">
                {content.status === "PUBLISHED" ? copy.premiumContentUnpublish : copy.premiumContentPublish}
              </button>
            </form>

            <details>
              <summary className="cursor-pointer text-sm font-medium">{copy.premiumContentEdit}</summary>
              <form action={savePremiumContent.bind(null, locale)} className="mt-3 grid gap-3">
                <input type="hidden" name="contentId" value={content.id} />
                <select
                  name="contentType"
                  defaultValue={content.contentType}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="TEXT">{copy.premiumContentTypeText}</option>
                  <option value="YOUTUBE">{copy.premiumContentTypeYoutube}</option>
                </select>
                <input defaultValue={content.titleEn} name="titleEn" placeholder={copy.premiumContentTitleEn} className="rounded-md border bg-background px-3 py-2 text-sm" required />
                <input defaultValue={content.titleJa ?? ""} name="titleJa" placeholder={copy.premiumContentTitleJa} className="rounded-md border bg-background px-3 py-2 text-sm" />
                <input defaultValue={content.summaryEn ?? ""} name="summaryEn" placeholder={copy.premiumContentSummaryEn} className="rounded-md border bg-background px-3 py-2 text-sm" />
                <input defaultValue={content.summaryJa ?? ""} name="summaryJa" placeholder={copy.premiumContentSummaryJa} className="rounded-md border bg-background px-3 py-2 text-sm" />
                <textarea defaultValue={content.bodyEn} name="bodyEn" placeholder={copy.premiumContentBodyEn} className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm" required />
                <textarea defaultValue={content.bodyJa ?? ""} name="bodyJa" placeholder={copy.premiumContentBodyJa} className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm" />
                <input defaultValue={content.thumbnailUrl ?? ""} name="thumbnailUrl" placeholder={copy.premiumContentThumbnailUrl} className="rounded-md border bg-background px-3 py-2 text-sm" />
                <input defaultValue={content.youtubeUrl ?? ""} name="youtubeUrl" placeholder={copy.premiumContentYoutubeUrl} className="rounded-md border bg-background px-3 py-2 text-sm" />
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">{copy.premiumContentAssignPlans}</legend>
                  {plans.map((plan) => (
                    <label key={plan.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="planIds"
                        value={plan.id}
                        defaultChecked={content.accesses.some((access) => access.subscriptionPlanId === plan.id)}
                      />
                      {locale === "ja" ? plan.nameJa || plan.nameEn : plan.nameEn || plan.nameJa || "Plan"}
                    </label>
                  ))}
                </fieldset>
                <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  {copy.subscriptionSavePlan}
                </button>
              </form>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
