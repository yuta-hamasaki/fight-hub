import { redirect } from "next/navigation";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { getPrismaClient } from "@/lib/prisma";

type ContentDetailRecord = {
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
  accesses: Array<{ subscriptionPlanId: string }>;
};

export default async function ClientPremiumContentDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; contentId: string }>;
}) {
  const { locale, contentId } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);
  const prisma = getPrismaClient();

  if (user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }

  const content = (await prisma.contentPost.findFirst({
    where: { id: contentId, status: "PUBLISHED", isPremium: true },
    include: {
      accesses: { select: { subscriptionPlanId: true } },
    },
  })) as ContentDetailRecord | null;

  if (!content) {
    redirect(`/${locale}/dashboard/client/content`);
  }

  const hasAccess = await prisma.subscriptionPurchase.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      subscriptionPlanId: {
        in: content.accesses.map((access) => access.subscriptionPlanId),
      },
    },
    select: { id: true },
  });

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.subscriptionPremiumLocked}</CardTitle>
          <CardDescription>{copy.subscriptionPremiumLockedBody}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const title = locale === "ja" ? content.titleJa || content.titleEn : content.titleEn || content.titleJa || "";
  const summary = locale === "ja" ? content.summaryJa || content.summaryEn : content.summaryEn || content.summaryJa || "";
  const body = locale === "ja" ? content.bodyJa || content.bodyEn : content.bodyEn || content.bodyJa || "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{summary || copy.premiumContentNoSummary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.thumbnailUrl ? (
            <Image
              src={content.thumbnailUrl}
              alt={title}
              width={1200}
              height={630}
              className="max-h-80 w-full rounded-md object-cover"
              unoptimized
            />
          ) : null}
          {content.contentType === "YOUTUBE" && content.youtubeUrl ? (
            <a href={content.youtubeUrl} target="_blank" rel="noreferrer" className="text-sm font-medium underline">
              {copy.premiumContentOpenYoutube}
            </a>
          ) : null}
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
