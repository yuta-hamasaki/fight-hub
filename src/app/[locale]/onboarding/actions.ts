"use server";

import { USER_ROLES, type AppUserRole } from "@/lib/auth/user-role";
import { getPrismaClient } from "@/lib/prisma";

export async function saveRoleSelection(clerkUserId: string, role: AppUserRole) {
  const prisma = getPrismaClient();

  const selectedRole = role === USER_ROLES.TRAINER ? "TRAINER" : "CLIENT";

  await prisma.user.update({
    where: { clerkUserId },
    data: { role: selectedRole },
  });
}
