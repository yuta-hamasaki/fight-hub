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

export default async function TrainerPremiumContentPage({
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
      <Link
        href={`/${locale}/dashboard/trainer`}
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        ← {copy.dashboard}
      </Link>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {copy.premiumContentManageTitle}
          </h1>
          <CardDescription>
            {copy.premiumContentManageDescription}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.premiumContentCreate}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={savePremiumContent.bind(null, locale)}
            className="grid gap-3"
          >
            <input type="hidden" name="contentId" value="" />
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {locale === "ja" ? "コンテンツの種類" : "Content type"}
              </span>
              <select
                name="contentType"
                defaultValue="TEXT"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="TEXT">{copy.premiumContentTypeText}</option>
                <option value="YOUTUBE">
                  {copy.premiumContentTypeYoutube}
                </option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {copy.premiumContentTitleEn}{" "}
                <span className="text-red-700" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                name="titleEn"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.premiumContentTitleJa}</span>
              <input
                name="titleJa"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.premiumContentSummaryEn}</span>
              <input
                name="summaryEn"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.premiumContentSummaryJa}</span>
              <input
                name="summaryJa"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>
                {copy.premiumContentBodyEn}{" "}
                <span className="text-red-700" aria-hidden="true">
                  *
                </span>
              </span>
              <textarea
                name="bodyEn"
                className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.premiumContentBodyJa}</span>
              <textarea
                name="bodyJa"
                className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.premiumContentThumbnailUrl}</span>
              <input
                name="thumbnailUrl"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.premiumContentYoutubeUrl}</span>
              <input
                name="youtubeUrl"
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">
                {copy.premiumContentAssignPlans}
              </legend>
              {plans.length ? (
                plans.map((plan) => (
                  <label
                    key={plan.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input type="checkbox" name="planIds" value={plan.id} />
                    {locale === "ja"
                      ? plan.nameJa || plan.nameEn
                      : plan.nameEn || plan.nameJa || "Plan"}
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {copy.subscriptionNoActivePlans}
                </p>
              )}
            </fieldset>
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              {copy.subscriptionSavePlan}
            </button>
          </form>
        </CardContent>
      </Card>

      {contents.map((content) => (
        <Card key={content.id}>
          <CardHeader>
            <CardTitle>
              {locale === "ja"
                ? content.titleJa || content.titleEn
                : content.titleEn || content.titleJa}
            </CardTitle>
            <CardDescription>
              {content.summaryEn ||
                content.summaryJa ||
                copy.premiumContentNoSummary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {content.contentType} · {content.status} ·{" "}
              {content.accesses.length} {copy.premiumContentAssignedPlans}
            </div>
            <form
              action={setPremiumContentPublishStatus.bind(null, locale)}
              className="inline-flex"
            >
              <input type="hidden" name="contentId" value={content.id} />
              <input
                type="hidden"
                name="next"
                value={content.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
              />
              <button
                type="submit"
                className="rounded-md border px-3 py-2 text-sm"
              >
                {content.status === "PUBLISHED"
                  ? copy.premiumContentUnpublish
                  : copy.premiumContentPublish}
              </button>
            </form>

            <details>
              <summary className="cursor-pointer text-sm font-medium">
                {copy.premiumContentEdit}
              </summary>
              <form
                action={savePremiumContent.bind(null, locale)}
                className="mt-3 grid gap-3"
              >
                <input type="hidden" name="contentId" value={content.id} />
                <label className="grid gap-2 text-sm font-medium">
                  <span>
                    {locale === "ja" ? "コンテンツの種類" : "Content type"}
                  </span>
                  <select
                    name="contentType"
                    defaultValue={content.contentType}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="TEXT">{copy.premiumContentTypeText}</option>
                    <option value="YOUTUBE">
                      {copy.premiumContentTypeYoutube}
                    </option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>
                    {copy.premiumContentTitleEn}{" "}
                    <span className="text-red-700" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    defaultValue={content.titleEn}
                    name="titleEn"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>{copy.premiumContentTitleJa}</span>
                  <input
                    defaultValue={content.titleJa ?? ""}
                    name="titleJa"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>{copy.premiumContentSummaryEn}</span>
                  <input
                    defaultValue={content.summaryEn ?? ""}
                    name="summaryEn"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>{copy.premiumContentSummaryJa}</span>
                  <input
                    defaultValue={content.summaryJa ?? ""}
                    name="summaryJa"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>
                    {copy.premiumContentBodyEn}{" "}
                    <span className="text-red-700" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <textarea
                    defaultValue={content.bodyEn}
                    name="bodyEn"
                    className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>{copy.premiumContentBodyJa}</span>
                  <textarea
                    defaultValue={content.bodyJa ?? ""}
                    name="bodyJa"
                    className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>{copy.premiumContentThumbnailUrl}</span>
                  <input
                    defaultValue={content.thumbnailUrl ?? ""}
                    name="thumbnailUrl"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>{copy.premiumContentYoutubeUrl}</span>
                  <input
                    defaultValue={content.youtubeUrl ?? ""}
                    name="youtubeUrl"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">
                    {copy.premiumContentAssignPlans}
                  </legend>
                  {plans.map((plan) => (
                    <label
                      key={plan.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="planIds"
                        value={plan.id}
                        defaultChecked={content.accesses.some(
                          (access) => access.subscriptionPlanId === plan.id,
                        )}
                      />
                      {locale === "ja"
                        ? plan.nameJa || plan.nameEn
                        : plan.nameEn || plan.nameJa || "Plan"}
                    </label>
                  ))}
                </fieldset>
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
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
