import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { requireDbUser } from "@/lib/auth/session";

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);


  if (user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.clientDashboardTitle}</CardTitle>
        <CardDescription>{copy.clientDashboardDescription}</CardDescription>
      </CardHeader>
      <CardContent>{copy.clientDashboardBody}</CardContent>
    </Card>
  );
}
