import Link from "next/link";
import type { Locale } from "@/lib/constants/locales";
import { buttonVariants } from "@/components/ui/button";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const ja = locale === "ja";
  const email = process.env.SUPPORT_EMAIL;
  const configured = email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-2xl border bg-white p-6 sm:p-10">
      <h1 className="text-3xl font-bold">
        {ja ? "お問い合わせ" : "Contact support"}
      </h1>
      <p>
        {ja
          ? "予約・返金・サブスクリプションについてご相談いただけます。ログインできない場合や、アカウントが利用停止中の場合もメールでお問い合わせください。"
          : "Get help with bookings, refunds, or subscriptions. You can email us even if you cannot sign in or your account is suspended."}
      </p>
      {configured ? (
        <p>
          <a href={`mailto:${email}`} className="font-semibold underline">
            {email}
          </a>
        </p>
      ) : (
        <p>
          {ja
            ? "メール窓口は準備中です。ログインできる方はアプリ内サポートをご利用ください。"
            : "Email support is being set up. If you can sign in, please use in-app support."}
        </p>
      )}
      <p className="text-sm text-slate-600">
        {ja
          ? "お問い合わせには予約IDなどを添えてください。カード番号やパスワードは送信しないでください。"
          : "Include your booking ID where possible. Do not send card numbers or passwords."}
      </p>
      <Link
        href={`/${locale}/dashboard/workspace?tab=support`}
        className={buttonVariants({ variant: "outline" })}
      >
        {ja ? "アプリ内サポートを開く" : "Open in-app support"}
      </Link>
    </section>
  );
}
