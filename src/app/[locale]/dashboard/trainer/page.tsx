import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";
import { requireDbUser } from "@/lib/auth/session";
import { dictionary } from "@/lib/i18n/dictionary";

export default async function TrainerDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);

  if (user.role !== "TRAINER") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.trainerDashboardTitle}</CardTitle>
        <CardDescription>{copy.trainerDashboardDescription}</CardDescription>
      </CardHeader>
      <CardContent>{copy.trainerDashboardBody}</CardContent>
    </Card>
  );
}
