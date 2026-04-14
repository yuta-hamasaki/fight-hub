import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/constants/locales";

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.welcome}</CardTitle>
        <CardDescription>
          App Router + Tailwind + Clerk + Prisma foundations are in place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Phase 2 structure is complete. Business logic will come in future phases.
        </p>
      </CardContent>
    </Card>
  );
}
