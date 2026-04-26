import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";

type TrainerCardProps = {
  locale: Locale;
  trainer: {
    id: string;
    name: string;
    bio: string;
    image: string;
    categories: string[];
    languages: string[];
    rating: number | null;
    reviewCount: number;
  };
  detailsCta: string;
};

export function TrainerCard({ locale, trainer, detailsCta }: TrainerCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-4">
          <Image src={trainer.image} alt={trainer.name} width={56} height={56} className="size-14 rounded-full border border-border object-cover" unoptimized />
          <div className="space-y-1">
            <CardTitle>{trainer.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {trainer.rating ? `${trainer.rating.toFixed(1)} ★` : "New"} · {trainer.reviewCount} reviews
            </p>
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{trainer.bio || "Trainer bio coming soon."}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {trainer.categories.length ? (
            trainer.categories.map((category) => (
              <span key={`${trainer.id}-${category}`} className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                {category}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">General</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{trainer.languages.join(" / ")}</p>
        <Link href={`/${locale}/trainers/${trainer.id}`} className="text-sm font-semibold underline-offset-4 hover:underline">
          {detailsCta}
        </Link>
      </CardContent>
    </Card>
  );
}
