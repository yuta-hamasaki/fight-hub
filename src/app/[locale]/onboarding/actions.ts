"use server";

import { USER_ROLES, type AppUserRole } from "@/lib/auth/user-role";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

export async function saveRoleSelection(locale: Locale, role: AppUserRole) {
  const user = await requireDbUser(locale);
  const selectedRole = role === USER_ROLES.TRAINER ? "TRAINER" : "CLIENT";

  await prisma.user.update({
    where: { clerkUserId: user.clerkUserId },
    data: { role: selectedRole },
  });
}
