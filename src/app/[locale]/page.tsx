import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";

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
        <CardDescription>{copy.homeDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          App Router + Clerk + Prisma role-based onboarding flow is now wired.
        </p>
      </CardContent>
    </Card>
  );
}
