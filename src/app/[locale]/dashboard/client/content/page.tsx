import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { getPrismaClient } from "@/lib/prisma";

type ClientContentRecord = {
  id: string;
  contentType: "TEXT" | "YOUTUBE";
  titleEn: string;
  titleJa: string | null;
  summaryEn: string | null;
  summaryJa: string | null;
  publishedAt: Date | null;
  author: {
    profile: { displayName: string | null; displayNameJa: string | null } | null;
  };
};

export default async function ClientPremiumContentPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);
  const prisma = getPrismaClient();

  if (user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }

  const contents = (await prisma.contentPost.findMany({
    where: {
      isPremium: true,
      status: "PUBLISHED",
      accesses: {
        some: {
          subscriptionPlan: {
            purchases: {
              some: {
                userId: user.id,
                status: "ACTIVE",
              },
            },
          },
        },
      },
    },
    include: {
      author: {
        include: { profile: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 40,
  })) as ClientContentRecord[];

  return (
    <div className="space-y-4">
      <Link href={`/${locale}/dashboard/client`} className="text-sm font-medium underline-offset-4 hover:underline">
        ← {copy.dashboard}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{copy.subscriptionPremiumContent}</CardTitle>
          <CardDescription>{copy.clientPremiumBrowseDescription}</CardDescription>
        </CardHeader>
      </Card>

      {contents.length ? (
        contents.map((content) => (
          <Card key={content.id}>
            <CardHeader>
              <CardTitle>{locale === "ja" ? content.titleJa || content.titleEn : content.titleEn || content.titleJa}</CardTitle>
              <CardDescription>{content.summaryEn || content.summaryJa || copy.premiumContentNoSummary}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{content.contentType}</p>
              <p>{content.author.profile?.displayName || content.author.profile?.displayNameJa || "Trainer"}</p>
              <Link href={`/${locale}/dashboard/client/content/${content.id}`} className="font-medium underline">
                {copy.clientPremiumOpenDetail}
              </Link>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{copy.subscriptionNoPremiumPosts}</CardContent>
        </Card>
      )}
    </div>
  );
}
