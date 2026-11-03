import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

export type ActiveSubscriptionItem = {
  id: string;
  startedAt: string;
  planName: string;
  trainerName: string;
  trainerProfileId: string;
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

function localized(valueEn: string | null | undefined, valueJa: string | null | undefined, locale: Locale) {
  if (locale === "ja") {
    return valueJa?.trim() || valueEn?.trim() || "";
  }

  return valueEn?.trim() || valueJa?.trim() || "";
}

export async function getActiveSubscriptions(userId: string, locale: Locale): Promise<ActiveSubscriptionItem[]> {
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
