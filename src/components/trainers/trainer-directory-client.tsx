"use client";

import { useEffect, useMemo, useState } from "react";

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
  region: string;
  minimumPrice: number | null;
  formats: string[];
  offeringIds: string[];
};

type TrainerDirectoryClientProps = {
  locale: Locale;
  trainers: TrainerListItem[];
  categories: string[];
  initialSearch?: string;
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

export function TrainerDirectoryClient({
  locale,
  trainers,
  categories,
  initialSearch = "",
  copy,
}: TrainerDirectoryClientProps) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState("all");

  const [language, setLanguage] = useState("");
  const [format, setFormat] = useState("");
  const [region, setRegion] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [day, setDay] = useState("");
  const [available, setAvailable] = useState<string[] | null>(null);
  const [dateError, setDateError] = useState(false);
  const ja = locale === "ja";
  useEffect(() => {
    if (!day) return;
    const controller = new AbortController();
    fetch(
      `/api/discovery?${new URLSearchParams({ day, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" })}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setAvailable(data.trainerIds);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setDateError(true);
      });
    return () => controller.abort();
  }, [day]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trainers.filter((trainer) => {
      const categoryMatch =
        category === "all" || trainer.categories.includes(category);
      const queryMatch =
        !query ||
        trainer.name.toLowerCase().includes(query) ||
        trainer.bio.toLowerCase().includes(query) ||
        trainer.categories.some((item) => item.toLowerCase().includes(query));

      return (
        categoryMatch &&
        queryMatch &&
        (!language || trainer.languages.includes(language)) &&
        (!format || trainer.formats.includes(format)) &&
        (!region ||
          trainer.region.toLowerCase().includes(region.toLowerCase())) &&
        (!maxPrice ||
          (trainer.minimumPrice !== null &&
            trainer.minimumPrice <= Number(maxPrice))) &&
        (!day || (available !== null && available.includes(trainer.id)))
      );
    });
  }, [
    category,
    search,
    trainers,
    language,
    format,
    region,
    maxPrice,
    day,
    available,
  ]);

  return (
    <section className="space-y-6">
      <div className="grid gap-5 rounded-2xl border border-border bg-white p-5 md:grid-cols-2">
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

      <details className="rounded-2xl border bg-white p-5">
        <summary>{ja ? "条件を絞り込む" : "Refine your search"}</summary>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm">
            {ja ? "対応言語" : "Language"}
            <select
              className="rounded-lg border p-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">{ja ? "すべて" : "All"}</option>
              {[...new Set(trainers.flatMap((t) => t.languages))]
                .sort()
                .map((l) => (
                  <option key={l}>{l}</option>
                ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {ja ? "指導形式" : "Format"}
            <select
              className="rounded-lg border p-2"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="">{ja ? "すべて" : "All"}</option>
              <option value="online">{ja ? "オンライン" : "Online"}</option>
              <option value="in_person">{ja ? "対面" : "In person"}</option>
              <option value="hybrid">{ja ? "両方" : "Hybrid"}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {ja ? "地域・駅名" : "Region / station"}
            <input
              className="rounded-lg border p-2"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {ja ? "料金上限（円）" : "Maximum price (JPY)"}
            <input
              className="rounded-lg border p-2"
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {ja ? "空きのある日" : "Available on"}
            <input
              className="rounded-lg border p-2"
              type="date"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setAvailable(null);
                setDateError(false);
              }}
            />
          </label>
        </div>
      </details>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="font-semibold">
          {filtered.length}
          {ja ? "人のトレーナー" : " trainers"}
        </p>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          onClick={() => {
            setSearch("");
            setCategory("all");
            setLanguage("");
            setFormat("");
            setRegion("");
            setMaxPrice("");
            setDay("");
            setAvailable(null);
            setDateError(false);
          }}
        >
          {ja ? "検索条件をリセット" : "Reset filters"}
        </button>
      </div>
      {day && available === null && !dateError && (
        <p role="status">
          {ja ? "空き日程を確認中…" : "Checking availability…"}
        </p>
      )}
      {dateError && (
        <p role="alert">
          {ja
            ? "空き日程を取得できません。日付を選び直してください。"
            : "Unable to load availability. Select a date again."}
        </p>
      )}
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trainer) => (
            <TrainerCard
              key={trainer.id}
              locale={locale}
              trainer={trainer}
              detailsCta={copy.detailsCta}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-semibold">{copy.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.emptyDescription}
          </p>
        </div>
      )}
    </section>
  );
}
