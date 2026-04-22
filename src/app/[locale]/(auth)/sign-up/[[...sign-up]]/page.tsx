import { SignUp } from "@clerk/nextjs";

import type { Locale } from "@/lib/constants/locales";
import { localizedPath } from "@/lib/auth/session";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex justify-center">
      <SignUp
        path={localizedPath(locale, "/sign-up")}
        signInUrl={localizedPath(locale, "/sign-in")}
        forceRedirectUrl={localizedPath(locale, "/onboarding")}
      />
    </div>
  );
}
