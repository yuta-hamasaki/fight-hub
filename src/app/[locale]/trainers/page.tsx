import type { Metadata } from "next";

import { TrainerDirectoryClient } from "@/components/trainers/trainer-directory-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { getTrainerDirectory } from "@/lib/trainers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = dictionary[locale];

  return {
    title: copy.trainerDiscoveryTitle,
    description: copy.trainerDiscoveryDescription,
  };
}

export default async function TrainerDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const query = await searchParams;
  const trainers = await getTrainerDirectory(locale);
  const categories = Array.from(
    new Set(trainers.flatMap((trainer) => trainer.categories)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-3xl font-bold">{copy.trainerDiscoveryTitle}</h1>
          <CardDescription>{copy.trainerDiscoveryDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {copy.trainerDiscoveryBody}
          </p>
        </CardContent>
      </Card>

      <TrainerDirectoryClient
        locale={locale}
        trainers={trainers}
        initialSearch={query.q ?? ""}
        categories={categories}
        copy={{
          searchLabel: copy.trainerSearchLabel,
          searchPlaceholder: copy.trainerSearchPlaceholder,
          filterLabel: copy.trainerCategoryLabel,
          allCategories: copy.trainerCategoryAll,
          emptyTitle: copy.trainerEmptyTitle,
          emptyDescription: copy.trainerEmptyDescription,
          detailsCta: copy.trainerDetailsCta,
        }}
      />
    </div>
  );
}
