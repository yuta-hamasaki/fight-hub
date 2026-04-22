"use client";

import { useMemo, useState } from "react";

import { TrainerCard } from "@/components/trainers/trainer-card";
import type { Locale } from "@/lib/constants/locales";

type TrainerListItem = {
  id: string;
  name: string;
  bio: string;
  image: string;
  categories: string[];
  languages: string[];
  rating: number | null;
  reviewCount: number;
};

type TrainerDirectoryClientProps = {
  locale: Locale;
  trainers: TrainerListItem[];
  categories: string[];
  copy: {
    searchLabel: string;
    searchPlaceholder: string;
    filterLabel: string;
    allCategories: string;
    emptyTitle: string;
    emptyDescription: string;
    detailsCta: string;
  };
};

export function TrainerDirectoryClient({ locale, trainers, categories, copy }: TrainerDirectoryClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trainers.filter((trainer) => {
      const categoryMatch = category === "all" || trainer.categories.includes(category);
      const queryMatch =
        !query ||
        trainer.name.toLowerCase().includes(query) ||
        trainer.bio.toLowerCase().includes(query) ||
        trainer.categories.some((item) => item.toLowerCase().includes(query));

      return categoryMatch && queryMatch;
    });
  }, [category, search, trainers]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span>{copy.searchLabel}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-10 w-full rounded-md border border-border bg-background px-3"
          />
        </label>

        <label className="space-y-2 text-sm font-medium">
          <span>{copy.filterLabel}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3"
          >
            <option value="all">{copy.allCategories}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trainer) => (
            <TrainerCard key={trainer.id} locale={locale} trainer={trainer} detailsCta={copy.detailsCta} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-semibold">{copy.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{copy.emptyDescription}</p>
        </div>
      )}
    </section>
  );
}
