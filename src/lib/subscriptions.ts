import type { Locale } from "@/lib/constants/locales";
import { getPrismaClient } from "@/lib/prisma";

export type ActiveSubscriptionItem = {
  id: string;
  startedAt: string;
  planName: string;
  trainerName: string;
  trainerProfileId: string;
};

export type PremiumPostItem = {
  id: string;
  trainerProfileId: string;
  title: string;
  body: string;
  trainerName: string;
  publishedAt: string;
};

type SubscriptionQueryRecord = {
  id: string;
  startedAt: Date;
  subscriptionPlan: {
    nameEn: string;
    nameJa: string | null;
    trainerProfileId: string;
    trainerProfile: {
      user: {
        email: string | null;
        profile: { displayName: string | null; displayNameJa: string | null } | null;
      };
    };
  };
};

type PremiumPostRecord = {
  id: string;
  contentType: "TEXT" | "YOUTUBE";
  titleEn: string;
  titleJa: string | null;
  summaryEn: string | null;
  summaryJa: string | null;
  bodyEn: string;
  bodyJa: string | null;
  youtubeUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  author: {
    email: string | null;
    profile: { displayName: string | null; displayNameJa: string | null } | null;
    trainerProfile: { id: string } | null;
  };
};

function localized(valueEn: string | null | undefined, valueJa: string | null | undefined, locale: Locale) {
  if (locale === "ja") {
    return valueJa?.trim() || valueEn?.trim() || "";
  }

  return valueEn?.trim() || valueJa?.trim() || "";
}

export async function hasActiveSubscriptionForTrainer(userId: string, trainerProfileId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  const purchase = await prisma.subscriptionPurchase.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      subscriptionPlan: {
        trainerProfileId,
      },
    },
    select: { id: true },
  });

  return Boolean(purchase);
}

export async function getActiveSubscriptions(userId: string, locale: Locale): Promise<ActiveSubscriptionItem[]> {
  const prisma = getPrismaClient();

  const subscriptions = (await prisma.subscriptionPurchase.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      subscriptionPlan: {
        include: {
          trainerProfile: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
  })) as SubscriptionQueryRecord[];

  return subscriptions.map((subscription) => {
    const trainerUser = subscription.subscriptionPlan.trainerProfile.user;
    const trainerName =
      localized(trainerUser.profile?.displayName, trainerUser.profile?.displayNameJa, locale) ||
      trainerUser.email ||
      "Trainer";

    return {
      id: subscription.id,
      startedAt: subscription.startedAt.toISOString().slice(0, 10),
      planName: localized(
        subscription.subscriptionPlan.nameEn,
        subscription.subscriptionPlan.nameJa,
        locale,
      ),
      trainerName,
      trainerProfileId: subscription.subscriptionPlan.trainerProfileId,
    };
  });
}

export async function getAccessiblePremiumPosts(userId: string, locale: Locale): Promise<PremiumPostItem[]> {
  const prisma = getPrismaClient();

  const activePlanIds = (await prisma.subscriptionPurchase.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    select: {
      subscriptionPlanId: true,
    },
  })) as Array<{ subscriptionPlanId: string }>;

  const planIds = [...new Set(activePlanIds.map((item) => item.subscriptionPlanId))];

  if (planIds.length === 0) {
    return [];
  }

  const posts = (await prisma.contentPost.findMany({
    where: {
      status: "PUBLISHED",
      isPremium: true,
      accesses: {
        some: {
          subscriptionPlanId: {
            in: planIds,
          },
        },
      },
    },
    include: {
      author: {
        include: {
          profile: true,
          trainerProfile: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 20,
  })) as PremiumPostRecord[];

  return posts.map((post) => ({
    id: post.id,
    trainerProfileId: post.author.trainerProfile?.id ?? "",
    title: localized(post.titleEn, post.titleJa, locale),
    body: localized(post.summaryEn, post.summaryJa, locale) || localized(post.bodyEn, post.bodyJa, locale),
    trainerName:
      localized(post.author.profile?.displayName, post.author.profile?.displayNameJa, locale) ||
      post.author.email ||
      "Trainer",
    publishedAt: post.publishedAt?.toISOString().slice(0, 10) ?? post.createdAt.toISOString().slice(0, 10),
  }));
}
