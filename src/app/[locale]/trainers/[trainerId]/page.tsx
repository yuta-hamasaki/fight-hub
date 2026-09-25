import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe2,
  Heart,
  Languages,
  MapPin,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";

import { SessionBookingForm } from "@/components/bookings/session-booking-form";
import { PurchaseSubscriptionButton } from "@/components/subscriptions/purchase-subscription-button";
import { ReviewManager } from "@/components/trainers/review-manager";
import type { Locale } from "@/lib/constants/locales";
import { dictionary } from "@/lib/i18n/dictionary";
import { prisma } from "@/lib/prisma";
import {
  hasActiveSubscriptionForTrainer,
  getAccessiblePremiumPosts,
} from "@/lib/subscriptions";
import { getTrainerDetail } from "@/lib/trainers";
import { Form, Field, Hidden, Panel } from "@/components/marketplace/forms";
import { ProfileViewTracker } from "@/components/marketplace/profile-view-tracker";
import { createBooking, manageReview } from "./actions";

const pageCopy = {
  en: {
    verified: "Verified trainer",
    reviews: "reviews",
    newTrainer: "New trainer",
    location: "Online · Worldwide",
    response: "Welcoming new clients",
    primaryCta: "Book a session",
    consult: "Explore sessions",
    trust: "Secure checkout · Cancel before payment",
    about: "About",
    approach: "How I can help",
    credentials: "Credentials & highlights",
    qualifications: "Certifications",
    sessions: "Choose your session",
    sessionsLead: "Start with the option that best matches your goals.",
    from: "from",
    membership: "Train together, consistently",
    membershipLead:
      "Get ongoing support and members-only content with a monthly plan.",
    monthly: "/ month",
    popular: "Monthly support",
    premium: "Member resources",
    reviewsTitle: "What clients say",
    links: "Find me online",
    allReviews: "Based on verified client experiences",
    noAchievements: "More profile details coming soon.",
    formats: "Coaching formats",
    minutes: "min",
    secure: "Secure payment",
  },
  ja: {
    verified: "本人確認済みトレーナー",
    reviews: "件のレビュー",
    newTrainer: "新しいトレーナー",
    location: "オンライン · 世界中から対応",
    response: "新規クライアント受付中",
    primaryCta: "セッションを予約",
    consult: "セッションを見る",
    trust: "安全な決済 · 決済前はキャンセル無料",
    about: "トレーナーについて",
    approach: "こんなサポートができます",
    credentials: "実績・ハイライト",
    qualifications: "資格",
    sessions: "あなたに合うセッションを選ぶ",
    sessionsLead: "目標に合ったメニューから、最初の一歩を始めましょう。",
    from: "",
    membership: "継続的なサポートで、習慣に",
    membershipLead:
      "月額プランで継続サポートとメンバー限定コンテンツを利用できます。",
    monthly: "/ 月",
    popular: "継続サポート",
    premium: "メンバー限定リソース",
    reviewsTitle: "クライアントの声",
    links: "外部サイト",
    allReviews: "実際のクライアントによる評価です",
    noAchievements: "プロフィール情報は近日追加予定です。",
    formats: "指導形式",
    minutes: "分",
    secure: "安全な決済",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; trainerId: string }>;
}): Promise<Metadata> {
  const { locale, trainerId } = await params;
  const trainer = await getTrainerDetail(locale, trainerId);
  if (!trainer) return { title: dictionary[locale].trainerDetailsNotFound };
  return {
    title: `${trainer.name} · ${dictionary[locale].trainerDiscoveryTitle}`,
    description: trainer.bio || dictionary[locale].trainerDiscoveryDescription,
  };
}

export default async function TrainerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; trainerId: string }>;
  searchParams: Promise<{
    booking?: string;
    purchase?: string;
    offering?: string;
  }>;
}) {
  const { locale, trainerId } = await params;
  const result = await searchParams;
  const copy = dictionary[locale];
  const ui = pageCopy[locale];
  const trainer = await getTrainerDetail(locale, trainerId);
  if (!trainer) notFound();

  const { userId } = await auth();
  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { clerkUserId: userId },
        select: { id: true, role: true },
      })
    : null;
  const canPurchase = dbUser?.role === "CLIENT";
  const ownReview = dbUser
    ? trainer.reviews.find((review) => review.reviewerId === dbUser.id)
    : undefined;
  const accessiblePosts = dbUser
    ? (await getAccessiblePremiumPosts(dbUser.id, locale)).filter(
        (p) => p.trainerProfileId === trainerId,
      )
    : [];
  const hasAccess = dbUser
    ? await hasActiveSubscriptionForTrainer(dbUser.id, trainerId)
    : false;
  const formatLabel = (format: string) =>
    format === "in_person"
      ? copy.sessionFormatInPerson
      : format === "hybrid"
        ? copy.sessionFormatHybrid
        : copy.sessionFormatOnline;
  const [passes, packages, favorite] = await Promise.all([
    canPurchase
      ? prisma.passPurchase.findMany({
          where: {
            userId: dbUser!.id,
            trainerId: trainer.trainerUserId,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
            remaining: { gt: 0 },
          },
          select: { id: true, offeringId: true, title: true, remaining: true },
        })
      : [],
    prisma.sessionPackage.findMany({
      where: { trainerId: trainer.trainerUserId, active: true },
    }),
    canPurchase
      ? prisma.favorite.findUnique({
          where: {
            userId_trainerProfileId: {
              userId: dbUser!.id,
              trainerProfileId: trainer.id,
            },
          },
        })
      : null,
  ]);
  const topCategories = trainer.categories.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl pb-20 text-[#10233f] sm:pb-8">
      <ProfileViewTracker trainerId={trainer.id} />
      {result.booking ? (
        <div
          role="status"
          className={`mb-5 rounded-xl border p-4 text-sm font-semibold ${result.booking === "canceled" ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50 text-amber-950"}`}
        >
          {locale === "ja"
            ? result.booking === "unavailable"
              ? "その時間は予約できません。別の日時を選択してください。"
              : result.booking === "canceled"
                ? "決済をキャンセルしました。"
                : "予約または決済を開始できませんでした。"
            : result.booking === "unavailable"
              ? "That time is unavailable. Choose another time."
              : result.booking === "canceled"
                ? "Checkout was canceled."
                : "The booking or payment could not be started."}
        </div>
      ) : null}

      <Link
        href={`/${locale}/trainers`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700"
      >
        <ArrowLeft className="size-4" />
        {copy.trainerBackToList.replace("← ", "")}
      </Link>

      <section className="relative overflow-hidden rounded-[28px] bg-[#071d38] px-5 py-7 text-white shadow-xl shadow-slate-200/70 sm:px-8 sm:py-9 lg:px-10">
        <div className="absolute -right-20 -top-32 size-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative grid gap-7 md:grid-cols-[180px_1fr] lg:grid-cols-[210px_1fr_270px] lg:items-center">
          <div className="relative mx-auto size-44 overflow-hidden rounded-[24px] border-4 border-white/15 bg-slate-100 shadow-2xl md:mx-0 md:size-48">
            <Image
              src={trainer.image}
              alt={trainer.name}
              fill
              sizes="192px"
              className="object-cover"
              unoptimized
            />
            <span
              className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-blue-500 ring-4 ring-[#071d38]"
              title={
                trainer.isVerified
                  ? ui.verified
                  : locale === "ja"
                    ? "トレーナー"
                    : "Trainer"
              }
            >
              <Check className="size-5 stroke-[3]" />
            </span>
          </div>
          <div className="min-w-0 text-center md:text-left">
            <div className="mb-3 flex flex-wrap justify-center gap-2 md:justify-start">
              {topCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/15"
                >
                  {category}
                </span>
              ))}
            </div>
            <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] text-blue-300 md:justify-start">
              <BadgeCheck className="size-4" />
              {trainer.isVerified
                ? ui.verified
                : locale === "ja"
                  ? "トレーナー"
                  : "Trainer"}
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {trainer.name}
            </h1>
            <p className="mt-2 max-w-2xl text-base font-medium text-slate-200 sm:text-lg">
              {trainer.headline || copy.trainerDefaultHeadline}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-300 md:justify-start">
              <span className="flex items-center gap-1.5">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <b className="text-white">
                  {trainer.rating?.toFixed(1) || ui.newTrainer}
                </b>
                {trainer.reviewCount
                  ? ` (${trainer.reviewCount} ${ui.reviews})`
                  : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {trainer.region || ui.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Languages className="size-4" />
                {trainer.languages.join(" · ")}
              </span>
            </div>
          </div>
          <aside className="rounded-2xl bg-white p-5 text-[#10233f] shadow-lg">
            <p className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" />
              {ui.response}
            </p>
            <a
              href={canPurchase ? "#book-session" : "#sessions"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700"
            >
              <CalendarDays className="size-5" />
              {canPurchase ? ui.primaryCta : ui.consult}
            </a>
            <a
              href="#sessions"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold hover:bg-slate-50"
            >
              {ui.consult}
              <ChevronRight className="size-4" />
            </a>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
              <ShieldCheck className="size-4" />
              {ui.trust}
            </p>
          </aside>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">{ui.about}</h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-600">
              {trainer.longBio || trainer.bio || copy.trainerDefaultBio}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {trainer.categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                >
                  {category}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black sm:text-2xl">{ui.approach}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(trainer.coachingFormats.length
                ? trainer.coachingFormats
                : trainer.categories
              ).map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    {index % 2 ? (
                      <Users className="size-5" />
                    ) : (
                      <Sparkles className="size-5" />
                    )}
                  </span>
                  <div>
                    <p className="font-bold">{item}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {locale === "ja"
                        ? "目標と経験に合わせて丁寧にサポートします。"
                        : "Personalized to your goals and experience level."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="sessions" className="scroll-mt-24">
            <h2 className="text-xl font-black sm:text-2xl">{ui.sessions}</h2>
            <p className="mt-1 text-sm text-slate-500">{ui.sessionsLead}</p>
            <div className="mt-5 space-y-3">
              {trainer.sessionOfferings.length ? (
                trainer.sessionOfferings.map((offering, index) => (
                  <article
                    key={offering.id}
                    className={`group rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${index === 0 ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-200"}`}
                  >
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black sm:text-lg">
                            {offering.title}
                          </h3>
                          {index === 0 ? (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                              {locale === "ja"
                                ? "おすすめ"
                                : "Best place to start"}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                          {offering.description || copy.trainerNoDescription}
                        </p>
                        <p className="mt-3 flex gap-4 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock3 className="size-4" />
                            {offering.durationMinutes} {ui.minutes}
                          </span>
                          <span className="flex items-center gap-1">
                            <Monitor className="size-4" />
                            {formatLabel(offering.format)}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-5 border-t border-slate-100 pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
                        <p className="text-xl font-black text-blue-700">
                          {offering.price}
                        </p>
                        <a
                          href={canPurchase ? "#book-session" : "#sessions"}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700"
                        >
                          {canPurchase ? ui.primaryCta : ui.consult}
                          <ChevronRight className="size-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  {copy.trainerNoSessions}
                </div>
              )}
            </div>
          </section>

          {trainer.subscriptionPlans.length ? (
            <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0b2443] to-[#123f76] p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-300">
                {ui.popular}
              </p>
              <h2 className="mt-2 text-2xl font-black">{ui.membership}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                {ui.membershipLead}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {trainer.subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl bg-white p-5 text-[#10233f]"
                  >
                    <p className="font-black">{plan.name}</p>
                    <p className="mt-2 min-h-10 text-sm text-slate-500">
                      {plan.description || copy.trainerNoDescription}
                    </p>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p>
                        <b className="text-xl text-blue-700">
                          {plan.priceMonthly}
                        </b>
                        <span className="text-xs text-slate-500">
                          {" "}
                          {ui.monthly}
                        </span>
                      </p>
                      {canPurchase ? (
                        <PurchaseSubscriptionButton
                          locale={locale}
                          planId={plan.id}
                          label={copy.subscriptionBuyNow}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {canPurchase && trainer.sessionOfferings.length ? (
            <section
              id="book-session"
              className="scroll-mt-24 rounded-2xl border border-blue-200 bg-blue-50/60 p-6 sm:p-8"
            >
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                  {ui.secure}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {copy.sessionBookingTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {copy.sessionBookingDescription}
                </p>
              </div>
              <p className="mb-4 text-sm">
                {locale === "ja"
                  ? `開始${trainer.cancellationHours}時間前までキャンセル無料。期限後は返金・回数返却の対象外です。`
                  : `Free cancellation until ${trainer.cancellationHours} hours before the session. Later cancellations are not refunded or credited.`}
              </p>
              <SessionBookingForm
                initialOfferingId={result.offering}
                passes={passes}
                offerings={trainer.sessionOfferings}
                action={createBooking.bind(null, locale, trainer.id)}
                copy={{
                  button: copy.sessionBookButton,
                  startsAt: copy.sessionStartsAt,
                  timezone: copy.sessionTimezone,
                }}
              />
            </section>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  {ui.reviewsTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{ui.allReviews}</p>
              </div>
              {trainer.rating ? (
                <p className="shrink-0 text-2xl font-black">
                  <Star className="mr-1 inline size-5 fill-amber-400 text-amber-400" />
                  {trainer.rating.toFixed(1)}
                </p>
              ) : null}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {trainer.reviews.length ? (
                trainer.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${i < review.rating ? "fill-current" : "text-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-3 font-bold">
                      {review.title || `${review.rating} ★`}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {review.comment || copy.trainerNoReviewBody}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-slate-400">
                      {review.reviewerName} · {review.createdAt}
                    </p>
                    {review.trainerReply && (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-blue-50 p-3 text-sm">
                        <b>
                          {locale === "ja"
                            ? "トレーナーからの返信"
                            : "Trainer reply"}
                        </b>
                        <br />
                        {review.trainerReply}
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <div className="col-span-2 rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                  {copy.trainerNoReviews}
                </div>
              )}
            </div>
          </section>

          {canPurchase ? (
            <ReviewManager
              action={manageReview.bind(null, locale, trainer.id)}
              existingReview={ownReview}
              copy={{
                title: locale === "ja" ? "レビューを投稿" : "Your review",
                description:
                  locale === "ja"
                    ? "評価とコメントはいつでも編集・削除できます。"
                    : "You can edit or delete your rating and comment at any time.",
                rating: locale === "ja" ? "評価" : "Rating",
                reviewTitle:
                  locale === "ja" ? "タイトル（任意）" : "Title (optional)",
                comment: locale === "ja" ? "コメント" : "Comment",
                create: locale === "ja" ? "投稿する" : "Post review",
                update: locale === "ja" ? "更新する" : "Update review",
                delete: locale === "ja" ? "削除する" : "Delete review",
              }}
            />
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Heart className="size-5 text-blue-600" />
              {ui.premium}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {hasAccess
                ? copy.subscriptionPremiumGranted
                : copy.subscriptionPremiumLockedBody}
            </p>
            {hasAccess && accessiblePosts.length ? (
              <div className="mt-4 space-y-3">
                {accessiblePosts.map((post) => (
                  <article key={post.id} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-bold">{post.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{post.body}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {canPurchase && (
            <Panel
              title={locale === "ja" ? "保存・問い合わせ" : "Save and contact"}
            >
              <Form
                locale={locale}
                op="favorite"
                id={trainer.id}
                tab="favorites"
                submit={
                  favorite
                    ? locale === "ja"
                      ? "お気に入りを解除"
                      : "Remove favorite"
                    : locale === "ja"
                      ? "お気に入りに保存"
                      : "Save favorite"
                }
              >
                {favorite && <Hidden name="remove" value="1" />}
              </Form>
              <Form
                locale={locale}
                op="message"
                tab="messages"
                submit={locale === "ja" ? "問い合わせる" : "Send inquiry"}
              >
                <Hidden name="trainerId" value={trainer.trainerUserId} />
                <Field
                  label={
                    locale === "ja"
                      ? "予約前の相談・質問"
                      : "Questions before booking"
                  }
                  name="body"
                  type="textarea"
                  required
                />
              </Form>
            </Panel>
          )}
          {!!packages.length && (
            <Panel title={locale === "ja" ? "回数券" : "Session packages"}>
              {packages.map((p) => (
                <article key={p.id} className="space-y-3 rounded-lg border p-3">
                  <h3 className="font-bold">{p.title}</h3>
                  <p>
                    {p.credits} {locale === "ja" ? "回" : "sessions"} ·{" "}
                    {Number(p.price)} {p.currency}
                  </p>
                  <p>
                    {locale === "ja"
                      ? `購入から${p.validityDays}日以内のセッションに利用できます。`
                      : `Use for sessions within ${p.validityDays} days of purchase.`}
                  </p>
                  {canPurchase && (
                    <Form
                      locale={locale}
                      op="buyPackage"
                      id={p.id}
                      tab="passes"
                      submit={locale === "ja" ? "購入する" : "Buy package"}
                    />
                  )}
                </article>
              ))}
            </Panel>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 font-black">
              <Trophy className="size-5 text-blue-600" />
              {ui.credentials}
            </h2>
            <ul className="mt-4 space-y-3">
              {trainer.achievements.length ? (
                trainer.achievements.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-5 text-slate-600"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-500">{ui.noAchievements}</li>
              )}
            </ul>
            {trainer.certifications.length ? (
              <>
                <h3 className="mt-6 flex items-center gap-2 border-t pt-5 text-sm font-black">
                  <Award className="size-4 text-blue-600" />
                  {ui.qualifications}
                </h3>
                <ul className="mt-3 space-y-2">
                  {trainer.certifications.map((item) => (
                    <li key={item} className="text-sm text-slate-600">
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 font-black">
              <Globe2 className="size-5 text-blue-600" />
              {copy.trainerLanguages}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {trainer.languages.map((language) => (
                <span
                  key={language}
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold"
                >
                  {language}
                </span>
              ))}
            </div>
            {trainer.coachingFormats.length ? (
              <>
                <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {ui.formats}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {trainer.coachingFormats.join(" · ")}
                </p>
              </>
            ) : null}
          </div>
          {trainer.externalLinks.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-black">{ui.links}</h2>
              <ul className="mt-3 space-y-2">
                {trainer.externalLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      {link.label}
                      <ExternalLink className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {trainer.sessionOfferings.length ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:hidden">
          <a
            href={canPurchase ? "#book-session" : "#sessions"}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white"
          >
            <MessageCircle className="size-5" />
            {canPurchase ? ui.primaryCta : ui.consult}
          </a>
        </div>
      ) : null}
    </div>
  );
}
