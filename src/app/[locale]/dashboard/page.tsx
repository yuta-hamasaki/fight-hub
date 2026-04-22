import { redirect } from "next/navigation";

import type { Locale } from "@/lib/constants/locales";
import { dashboardPathForRole, requireDbUser } from "@/lib/auth/session";

export default async function DashboardIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const user = await requireDbUser(locale);


  redirect(dashboardPathForRole(locale, user.role));
}
