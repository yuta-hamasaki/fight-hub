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
    <div className="flex justify-center">
      <SignIn
        path={localizedPath(locale, "/sign-in")}
        signUpUrl={localizedPath(locale, "/sign-up")}
        forceRedirectUrl={localizedPath(locale, "/dashboard")}
      />
    </div>
  );
}
