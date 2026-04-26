import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";

export type DbRole = "CLIENT" | "TRAINER" | "ADMIN";

export type DbUser = {
  id: string;
  clerkUserId: string;
  email: string | null;
  role: DbRole;
};

export function localizedPath(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

export function dashboardPathForRole(locale: Locale, role: DbRole | "CLIENT" | "TRAINER") {
  return role === "TRAINER"
    ? localizedPath(locale, "/dashboard/trainer")
    : localizedPath(locale, "/dashboard/client");
}

export async function requireAuth(locale: Locale) {
  const { userId } = await auth();

  if (!userId) {
    redirect(localizedPath(locale, "/sign-in"));
  }

  return userId;
}

export async function ensureDbUser(clerkUserId: string): Promise<DbUser> {
  const clerkProfile = await currentUser();

  const primaryEmail = clerkProfile?.emailAddresses.find(
    (email) => email.id === clerkProfile.primaryEmailAddressId,
  )?.emailAddress;

  return prisma.user.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      email: primaryEmail,
    },
    update: {
      email: primaryEmail,
    },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      role: true,
    },
  }) as Promise<DbUser>;
}

export async function requireDbUser(locale: Locale): Promise<DbUser> {
  const clerkUserId = await requireAuth(locale);
  return ensureDbUser(clerkUserId);
}
