import { SignIn } from "@clerk/nextjs";

import type { Locale } from "@/lib/constants/locales";
import { localizedPath } from "@/lib/auth/session";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-md space-y-6 py-6 sm:py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          {locale === "ja" ? "おかえりなさい" : "Welcome back"}
        </h1>
        <p className="mt-3 text-slate-600">
          {locale === "ja"
            ? "予約やメッセージを、ひとつのマイページで。"
            : "Your bookings and messages, together in one workspace."}
        </p>
      </div>
      <div className="flex justify-center">
        <SignIn
          path={localizedPath(locale, "/sign-in")}
          signUpUrl={localizedPath(locale, "/sign-up")}
          forceRedirectUrl={localizedPath(locale, "/dashboard")}
        />
      </div>
    </div>
  );
}
