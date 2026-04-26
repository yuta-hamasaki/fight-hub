import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/constants/locales";
import { dashboardPathForRole, requireDbUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/auth/user-role";

import { saveRoleSelection } from "./actions";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = dictionary[locale];
  const user = await requireDbUser(locale);


  async function chooseRole(role: "CLIENT" | "TRAINER") {
    "use server";

    await saveRoleSelection(user.clerkUserId, role);
    redirect(dashboardPathForRole(locale, role));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.selectRoleTitle}</CardTitle>
        <CardDescription>{copy.selectRoleDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <form action={chooseRole.bind(null, USER_ROLES.CLIENT)}>
          <Button type="submit" className="w-full sm:w-auto">
            {copy.roleClient}
          </Button>
        </form>
        <form action={chooseRole.bind(null, USER_ROLES.TRAINER)}>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            {copy.roleTrainer}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
