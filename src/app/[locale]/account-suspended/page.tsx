import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/constants/locales";

export default async function AccountSuspendedPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const ja = locale === "ja";
  return (
    <section className="mx-auto max-w-xl space-y-6 rounded-2xl border bg-white p-6 sm:p-10">
      <h1 className="text-2xl font-bold">
        {ja
          ? "アカウントの利用は停止されています"
          : "Your account has been suspended"}
      </h1>
      <p>
        {ja
          ? "ご予約やお支払い、利用再開についてはサポートにお問い合わせください。利用停止によって継続課金が自動で解約されることはありません。"
          : "Contact support about existing bookings, payments, or restoring access. Suspension does not automatically cancel recurring payments."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/${locale}/support`} className={buttonVariants()}>
          {ja ? "サポートに問い合わせる" : "Contact support"}
        </Link>
        <SignOutButton redirectUrl={`/${locale}`}>
          <Button variant="outline">{ja ? "ログアウト" : "Sign out"}</Button>
        </SignOutButton>
      </div>
    </section>
  );
}
