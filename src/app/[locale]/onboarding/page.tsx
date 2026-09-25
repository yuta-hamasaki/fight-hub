import { redirect } from "next/navigation";

import { Dumbbell, UserRound } from "lucide-react";
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
  await requireDbUser(locale);

  async function chooseRole(role: "CLIENT" | "TRAINER") {
    "use server";

    await saveRoleSelection(locale, role);
    redirect(dashboardPathForRole(locale, role));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-10">
      <div className="text-center">
        <p className="mb-3 text-sm font-semibold text-blue-700">
          {locale === "ja" ? "ようこそ、Fight Hubへ" : "WELCOME TO FIGHT HUB"}
        </p>
        <h1 className="text-3xl font-bold">{copy.selectRoleTitle}</h1>
        <p className="mt-4 text-slate-600">{copy.selectRoleDescription}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <form
          action={chooseRole.bind(null, USER_ROLES.CLIENT)}
          className="flex flex-col rounded-2xl border bg-white p-6 sm:p-8"
        >
          <UserRound
            aria-hidden="true"
            className="mb-6 size-10 text-blue-700"
          />
          <h2 className="text-xl font-bold">{copy.roleClient}</h2>
          <p className="mb-8 mt-3 flex-1 text-slate-600">
            {locale === "ja"
              ? "自分に合うトレーナーを探して予約。目標や課題を共有して、トレーニングを続けましょう。"
              : "Find a trainer, book sessions and keep track of your goals and progress."}
          </p>
          <Button type="submit" className="w-full">
            {locale === "ja" ? "トレーニングを始める" : "Start training"}
          </Button>
        </form>
        <form
          action={chooseRole.bind(null, USER_ROLES.TRAINER)}
          className="flex flex-col rounded-2xl border bg-white p-6 sm:p-8"
        >
          <Dumbbell aria-hidden="true" className="mb-6 size-10 text-blue-700" />
          <h2 className="text-xl font-bold">{copy.roleTrainer}</h2>
          <p className="mb-8 mt-3 flex-1 text-slate-600">
            {locale === "ja"
              ? "プロフィールやレッスンを公開。予約、顧客への指導、売上をまとめて管理できます。"
              : "Publish your profile and sessions. Manage bookings, coaching and revenue in one place."}
          </p>
          <Button type="submit" variant="outline" className="w-full">
            {locale === "ja" ? "トレーナーとして始める" : "Start coaching"}
          </Button>
        </form>
      </div>
    </div>
  );
}
