import Link from "next/link";
import {
  ArrowRight,
  Search,
  CalendarDays,
  Users,
  CreditCard,
} from "lucide-react";
import { TrainerCard } from "@/components/trainers/trainer-card";
import { buttonVariants } from "@/components/ui/button";
import { getTrainerDirectory } from "@/lib/trainers";
import type { Locale } from "@/lib/constants/locales";

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const ja = locale === "ja";
  const trainers = (await getTrainerDirectory(locale)).slice(0, 3);
  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="grid gap-10 rounded-3xl bg-[#102b4e] px-6 py-10 text-white sm:px-10 sm:py-16 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <p className="mb-5 text-sm font-semibold tracking-wider text-blue-200">
            {ja
              ? "格闘技・フィットネスのパーソナル指導"
              : "PERSONAL COACHING · MARTIAL ARTS & FITNESS"}
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {ja ? (
              <>
                自分に合うコーチと、
                <br />
                次の一歩へ。
              </>
            ) : (
              <>
                Find your coach.
                <br />
                Take the next step.
              </>
            )}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-200">
            {ja
              ? "種目、指導スタイル、料金を比較。あなたの目標やペースに合うトレーナーを見つけて、空いている日時に予約できます。"
              : "Compare specialties, coaching styles and prices. Find a trainer who fits your goals and book a time that works for you."}
          </p>
          <Link
            href={`/${locale}/trainers`}
            className={`${buttonVariants({ size: "lg", variant: "outline" })} mt-8`}
          >
            {ja ? "トレーナーを探す" : "Explore trainers"}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
        <form
          action={`/${locale}/trainers`}
          className="rounded-2xl bg-white p-6 text-slate-900 shadow-lg sm:p-8"
        >
          <h2 className="text-xl font-bold">
            {ja
              ? "どんなトレーニングを始めますか？"
              : "What would you like to train?"}
          </h2>
          <label className="mt-6 grid gap-2 text-sm font-semibold">
            {ja ? "種目・トレーナー名" : "Sport or trainer name"}
            <input name="q" type="search" className="w-full border px-4 py-3" />
          </label>
          <p className="mt-2 text-sm text-slate-500">
            {ja
              ? "例：ボクシング、柔術、ヨガ"
              : "For example: boxing, jiu-jitsu, yoga"}
          </p>
          <button type="submit" className={`${buttonVariants()} mt-5 w-full`}>
            <Search aria-hidden="true" className="size-5" />
            {ja ? "条件に合うコーチを検索" : "Find matching coaches"}
          </button>
          <p className="mt-5 border-t pt-4 text-sm text-slate-600">
            {ja
              ? "検索画面で、エリア・料金・空き日程も絞り込めます。"
              : "Filter by location, price and availability on the results page."}
          </p>
        </form>
      </section>
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-blue-700">
              {ja ? "あなたに合う指導を" : "COACHING THAT FITS YOU"}
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              {ja ? "トレーナーを見つける" : "Meet your next trainer"}
            </h2>
          </div>
          <Link
            href={`/${locale}/trainers`}
            className="flex min-h-12 items-center gap-2 font-semibold text-blue-700 hover:underline"
          >
            {ja ? "すべて見る" : "View all"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        {trainers.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                locale={locale}
                detailsCta={
                  ja ? "プロフィール・料金を見る" : "View profile and prices"
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-8">
            <p>
              {ja
                ? "公開中のトレーナーはまだいません。"
                : "There are no published trainers yet."}
            </p>
          </div>
        )}
      </section>
      <section
        id="how-it-works"
        className="rounded-3xl border bg-white p-6 sm:p-10"
      >
        <h2 className="text-2xl font-bold">
          {ja ? "ご利用の流れ" : "How it works"}
        </h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Search,
              title: ja ? "1. 条件で探す" : "1. Find your fit",
              body: ja
                ? "種目や対応言語、エリア、予算からトレーナーを絞り込みます。"
                : "Search by sport, language, location and budget.",
            },
            {
              icon: Users,
              title: ja ? "2. 比較して選ぶ" : "2. Compare coaches",
              body: ja
                ? "プロフィール、口コミ、料金を確認し、自分に合う指導を選びます。"
                : "Read profiles and reviews, then compare coaching options and prices.",
            },
            {
              icon: CalendarDays,
              title: ja ? "3. 日時を予約する" : "3. Book a session",
              body: ja
                ? "空いている日時を選んで予約。予約内容はマイページで確認できます。"
                : "Choose an available time. Manage your booking in your workspace.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="mb-4 grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Icon aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center gap-3 border-t pt-6 text-sm text-slate-600">
          <CreditCard aria-hidden="true" className="size-5 shrink-0" />
          {ja
            ? "お支払いにはStripeを利用します。料金は予約前に確認できます。"
            : "Payments are processed by Stripe. Review prices before booking."}
        </p>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-blue-50 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-bold">
            {ja
              ? "あなたの経験を、誰かの力に。"
              : "Turn your experience into someone’s progress."}
          </h2>
          <p className="mt-2 text-slate-600">
            {ja
              ? "トレーナーとしてプロフィールやレッスンを公開しましょう。"
              : "Create your trainer profile and share your coaching."}
          </p>
        </div>
        <Link
          href={`/${locale}/onboarding`}
          className={buttonVariants({ variant: "outline" })}
        >
          {ja ? "トレーナーとして始める" : "Start coaching"}
        </Link>
      </section>
    </div>
  );
}
