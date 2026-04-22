import type { Locale } from "@/lib/constants/locales";
import { getPrismaClient } from "@/lib/prisma";

type TrainerDirectoryItem = {
  id: string;
  name: string;
  bio: string;
  image: string;
  categories: string[];
  languages: string[];
  achievements: string[];
  rating: number | null;
  reviewCount: number;
};

type DirectoryTrainerRecord = {
  id: string;
  experienceYears: number | null;
  user: {
    email: string | null;
    profile: {
      displayName: string | null;
      displayNameJa: string | null;
      bio: string | null;
      bioJa: string | null;
      locale: string | null;
    } | null;
  };
  categories: Array<{ key: string; labelEn: string; labelJa: string | null }>;
  reviews: Array<{ rating: number }>;
};

type DetailTrainerRecord = {
  id: string;
  userId: string;
  headline: string | null;
  headlineJa: string | null;
  experienceYears: number | null;
  user: {
    email: string | null;
    profile: {
      displayName: string | null;
      displayNameJa: string | null;
      bio: string | null;
      bioJa: string | null;
      locale: string | null;
    } | null;
    contentPosts: Array<{
      id: string;
      titleEn: string;
      titleJa: string | null;
      bodyEn: string;
      bodyJa: string | null;
      publishedAt: Date | null;
      createdAt: Date;
    }>;
    profile: { displayName: string | null; displayNameJa: string | null; bio: string | null; bioJa: string | null; locale: string | null } | null;
    stripeAccount: { detailsSubmitted: boolean; chargesEnabled: boolean; payoutsEnabled: boolean } | null;
  };
  categories: Array<{ key: string; labelEn: string; labelJa: string | null }>;
  offerings: Array<{
    id: string;
    titleEn: string;
    titleJa: string | null;
    descriptionEn: string | null;
    descriptionJa: string | null;
    durationMinutes: number;
    price: { toString(): string };
    currency: string;
  }>;
  plans: Array<{
    id: string;
    nameEn: string;
    nameJa: string | null;
    descriptionEn: string | null;
    descriptionJa: string | null;
    priceMonthly: { toString(): string };
    currency: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    titleEn: string | null;
    titleJa: string | null;
    commentEn: string | null;
    commentJa: string | null;
    createdAt: Date;
    reviewer: { email: string | null; profile: { displayName: string | null; displayNameJa: string | null } | null };
  }>;
};

export type TrainerDetail = TrainerDirectoryItem & {
  trainerUserId: string;
  headline: string;
  sessionOfferings: Array<{ id: string; title: string; description: string; durationMinutes: number; price: string }>;
  subscriptionPlans: Array<{ id: string; name: string; description: string; priceMonthly: string }>;
  reviews: Array<{ id: string; rating: number; title: string; comment: string; reviewerName: string; createdAt: string }>;
  premiumPosts: Array<{ id: string; title: string; body: string; publishedAt: string }>;
  externalLinks: Array<{ label: string; href: string }>;
};

function localized(valueEn: string | null | undefined, valueJa: string | null | undefined, locale: Locale): string {
  if (locale === "ja") {
    return valueJa?.trim() || valueEn?.trim() || "";
  }

  return valueEn?.trim() || valueJa?.trim() || "";
}

function toPrice(amount: number | string, currency: string) {
  const numeric = Number(amount);

  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(numeric);
}

function avatarDataUri(name: string) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("") || "TR";

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><rect width='100%' height='100%' fill='#f4f4f5'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='84' fill='#27272a' font-family='Inter, Arial, sans-serif'>${initials}</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildLanguages(locale: string | null | undefined): string[] {
  if (locale?.toLowerCase().startsWith("ja")) {
    return ["Japanese", "English"];
  }

  return ["English"];
}

export async function getTrainerDirectory(locale: Locale): Promise<TrainerDirectoryItem[]> {
  const prisma = getPrismaClient();

  try {
    const trainers = (await prisma.trainerProfile.findMany({
      where: { isPublished: true },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        categories: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })) as DirectoryTrainerRecord[];

    return trainers.map((trainer) => {
      const name =
        localized(trainer.user.profile?.displayName ?? "", trainer.user.profile?.displayNameJa ?? "", locale) ||
        trainer.user.email ||
        "Trainer";
      const bio = localized(trainer.user.profile?.bio ?? "", trainer.user.profile?.bioJa ?? "", locale);
      const categoryLabels = trainer.categories.map((category) =>
        localized(category.labelEn, category.labelJa, locale) || category.key,
      );
      const ratings = trainer.reviews.map((review) => review.rating);
      const rating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;

      return {
        id: trainer.id,
        name,
        bio,
        image: avatarDataUri(name),
        categories: categoryLabels,
        languages: buildLanguages(trainer.user.profile?.locale),
        achievements: [
          trainer.experienceYears ? `${trainer.experienceYears}+ years experience` : "Newly onboarded trainer",
          `${trainer.reviews.length} verified reviews`,
        ],
        rating,
        reviewCount: ratings.length,
      };
    });
  } catch {
    return [];
  }
}

export async function getTrainerDetail(locale: Locale, trainerId: string): Promise<TrainerDetail | null> {
  const prisma = getPrismaClient();

  try {
    const trainer = (await prisma.trainerProfile.findFirst({
      where: { id: trainerId, isPublished: true },
      include: {
        user: {
          include: {
            profile: true,
            contentPosts: {
              where: { status: "PUBLISHED", isPremium: true },
              orderBy: { publishedAt: "desc" },
              take: 5,
              select: {
                id: true,
                titleEn: true,
                titleJa: true,
                bodyEn: true,
                bodyJa: true,
                publishedAt: true,
                createdAt: true,
            stripeAccount: {
              select: {
                detailsSubmitted: true,
                chargesEnabled: true,
                payoutsEnabled: true,
              },
            },
          },
        },
        categories: true,
        offerings: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
        },
        plans: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            reviewer: {
              include: {
                profile: true,
              },
            },
          },
          take: 10,
        },
      },
    })) as DetailTrainerRecord | null;

    if (!trainer) {
      return null;
    }

    const name =
      localized(trainer.user.profile?.displayName ?? "", trainer.user.profile?.displayNameJa ?? "", locale) ||
      trainer.user.email ||
      "Trainer";

    const ratings = trainer.reviews.map((review) => review.rating);
    const onboardingComplete = Boolean(
      trainer.user.stripeAccount?.detailsSubmitted &&
        trainer.user.stripeAccount?.chargesEnabled &&
        trainer.user.stripeAccount?.payoutsEnabled,
    );
    const offerings = onboardingComplete ? trainer.offerings : [];
    const plans = onboardingComplete ? trainer.plans : [];

    return {
      id: trainer.id,
      trainerUserId: trainer.userId,
      name,
      headline: localized(trainer.headline, trainer.headlineJa, locale),
      bio: localized(trainer.user.profile?.bio ?? "", trainer.user.profile?.bioJa ?? "", locale),
      image: avatarDataUri(name),
      categories: trainer.categories.map((category) => localized(category.labelEn, category.labelJa, locale) || category.key),
      languages: buildLanguages(trainer.user.profile?.locale),
      achievements: [
        trainer.experienceYears ? `${trainer.experienceYears}+ years coaching` : "Growing coaching portfolio",
        offerings.length ? `${offerings.length} active session offerings` : "No active sessions yet",
      ],
      rating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
      reviewCount: ratings.length,
      sessionOfferings: offerings.map((offering) => ({
        id: offering.id,
        title: localized(offering.titleEn, offering.titleJa, locale),
        description: localized(offering.descriptionEn, offering.descriptionJa, locale),
        durationMinutes: offering.durationMinutes,
        price: toPrice(offering.price.toString(), offering.currency),
      })),
      subscriptionPlans: plans.map((plan) => ({
        id: plan.id,
        name: localized(plan.nameEn, plan.nameJa, locale),
        description: localized(plan.descriptionEn, plan.descriptionJa, locale),
        priceMonthly: toPrice(plan.priceMonthly.toString(), plan.currency),
      })),
      premiumPosts: trainer.user.contentPosts.map((post) => ({
        id: post.id,
        title: localized(post.titleEn, post.titleJa, locale),
        body: localized(post.bodyEn, post.bodyJa, locale),
        publishedAt: (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10),
      })),
      reviews: trainer.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: localized(review.titleEn, review.titleJa, locale),
        comment: localized(review.commentEn, review.commentJa, locale),
        reviewerName:
          localized(
            review.reviewer.profile?.displayName ?? "",
            review.reviewer.profile?.displayNameJa ?? "",
            locale,
          ) || review.reviewer.email || "Member",
        createdAt: review.createdAt.toISOString().slice(0, 10),
      })),
      externalLinks: [],
    };
  } catch {
    return null;
  }
}
