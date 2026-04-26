"use server";

import { USER_ROLES, type AppUserRole } from "@/lib/auth/user-role";
import { prisma } from "@/lib/prisma";

export async function saveRoleSelection(clerkUserId: string, role: AppUserRole) {
  const selectedRole = role === USER_ROLES.TRAINER ? "TRAINER" : "CLIENT";

  await prisma.user.update({
    where: { clerkUserId },
    data: { role: selectedRole },
  });
}
