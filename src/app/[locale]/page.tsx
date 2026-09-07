import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/constants/locales";

const trainers = [
  { name: "山田 大輔", sport: "ボクシング", area: "東京都・渋谷区 / オンライン", price: "¥5,000", rating: "4.9", reviews: "124件", tone: "from-slate-800 via-slate-600 to-blue-950" },
  { name: "Maria Santos", sport: "ブラジリアン柔術", area: "東京都・世田谷区 / オンライン", price: "¥6,000", rating: "4.8", reviews: "89件", tone: "from-stone-200 via-slate-100 to-blue-200" },
  { name: "佐藤 健一", sport: "ストレングストレーニング", area: "東京都・新宿区 / オンライン", price: "¥4,500", rating: "4.8", reviews: "56件", tone: "from-slate-600 via-slate-400 to-slate-900" },
];

const copy = {
  ja: {
    title: <>あなたに合うコーチが、<br />きっと見つかる。</>,
    intro: "格闘技・フィットネスの信頼できるトレーナーを比較して、日本語でも英語でも、かんたんに予約できます。",
    recommended: "おすすめのトレーナー",
    recommendedText: "実績のあるトレーナーから、あなたにぴったりのコーチを見つけましょう。",
    all: "すべてのトレーナーを見る",
  },
  en: {
    title: <>The right coach for you<br />is closer than you think.</>,
    intro: "Compare trusted martial arts and fitness trainers, then book easily in Japanese or English.",
    recommended: "Recommended trainers",
    recommendedText: "Meet experienced coaches ready to help you reach your goals.",
    all: "View all trainers",
  },
} satisfies Record<Locale, object>;

export default async function LocalizedHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const text = copy[locale] as typeof copy.ja;

  return (
    <div className="landing-page -mx-4 -mt-10 text-[#09213f] sm:-mx-6 lg:-mx-8">
      <section className="relative overflow-hidden bg-[#faf8f4] px-5 pb-12 pt-12 sm:px-8 lg:px-12 lg:pb-0">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-center">
          <div className="relative z-10 pb-8 lg:pb-20">
            <h1 className="text-[clamp(2.4rem,5vw,4.45rem)] font-extrabold leading-[1.25] tracking-[-.055em]">{text.title}</h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-600 sm:text-lg">{text.intro}</p>
          </div>
          <div className="grid h-[470px] grid-cols-2 gap-3 lg:h-[650px]">
            <SportPanel label="BOXING" sub="ボクシング" className="mt-0 rounded-[60px_20px_55px_24px] bg-[linear-gradient(145deg,#172e4d,#50789a_48%,#0b1522)]" />
            <SportPanel label="BRAZILIAN\nJIU-JITSU" sub="ブラジリアン柔術" className="mt-5 rounded-[55px_24px_60px_25px] bg-[linear-gradient(145deg,#d6d0c8,#f2e7d8_48%,#7991aa)]" />
            <SportPanel label="STRENGTH\nTRAINING" sub="ストレングストレーニング" className="-mt-10 rounded-[24px_58px_25px_60px] bg-[linear-gradient(145deg,#9aa8b1,#172432_55%,#02070b)]" />
            <SportPanel label="YOGA &\nMOBILITY" sub="ヨガ・モビリティ" className="-mt-4 rounded-[55px_24px_60px_24px] bg-[linear-gradient(145deg,#eee6dd,#aab9a1_50%,#536b65)]" />
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-2 max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(17,40,70,.10)] lg:-mt-20">
          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1fr_1.25fr]">
            <SearchField icon={<Users />} label="種目" value="すべての種目" />
            <SearchField icon={<MapPin />} label="エリア / オンライン" value="東京、大阪、オンラインなど" />
            <SearchField icon={<CalendarDays />} label="希望日時" value="日付を選択" />
            <Link href={`/${locale}/trainers`} className="flex min-h-16 items-center justify-center gap-3 rounded-lg bg-[#0756d8] px-5 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
              <Search className="size-6" /> トレーナーを検索
            </Link>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 py-6 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-2"><ShieldCheck className="size-5 fill-blue-600 text-white" />本人確認済みのトレーナー</span>
          <span className="flex items-center gap-2"><Star className="size-5 fill-blue-700 text-blue-700" />リアルな口コミ</span>
          <span className="flex items-center gap-2"><CreditCard className="size-5 text-blue-700" />Stripeで安全決済</span>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div><h2 className="text-3xl font-extrabold tracking-tight">{text.recommended}</h2><p className="mt-2 text-slate-600">{text.recommendedText}</p></div>
            <Link href={`/${locale}/trainers`} className="hidden items-center gap-2 font-bold text-blue-700 sm:flex">{text.all}<ArrowRight className="size-4" /></Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {trainers.map((trainer, index) => <TrainerCard key={trainer.name} trainer={trainer} index={index} locale={locale} />)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-[#eef6ff] px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_3fr] lg:items-center">
          <div><h2 className="text-3xl font-extrabold leading-snug">かんたん3ステップで、<br />理想のコーチと出会える</h2><p className="mt-3 text-sm text-slate-600">はじめての方でも安心。シンプルな流れで予約できます。</p></div>
          <div className="grid gap-8 sm:grid-cols-3">
            <Step icon={<Search />} title="1. 探す" body="種目・エリア・日時でトレーナーを検索" />
            <Step icon={<Users />} title="2. 比較する" body="プロフィール・口コミ・料金・空き状況をチェック" />
            <Step icon={<CalendarDays />} title="3. 予約する" body="希望の日時で予約してレッスンを受ける" />
          </div>
        </div>
      </section>

      <section className="grid bg-white lg:grid-cols-2">
        <div className="flex items-center gap-7 px-6 py-14 sm:px-12 lg:px-[max(3rem,calc((100vw-80rem)/2))] lg:pr-12">
          <div className="grid size-40 shrink-0 place-items-center rounded-[32px] bg-gradient-to-br from-blue-100 via-amber-50 to-blue-300 text-6xl">☺</div>
          <div><blockquote className="text-2xl font-extrabold leading-snug">“はじめてでも安心して<br />予約できました”</blockquote><p className="mt-4 leading-7 text-slate-600">口コミやプロフィールがわかりやすく、安心して予約できました。トレーナーさんも親切で、楽しく続けられています。</p><p className="mt-4 text-sm font-bold">miho さん（20代・東京都）</p></div>
        </div>
        <div className="flex min-h-80 items-center bg-[linear-gradient(145deg,#f5dfcc,#bdd7ec_55%,#5a8b8b)] px-12 py-16">
          <div><p className="text-2xl leading-relaxed tracking-[.18em]">動くことは、<br />自分を好きになること。</p><p className="mt-5 text-xs tracking-[.18em] text-slate-500">A STRONGER, KINDER YOU</p></div>
        </div>
      </section>
    </div>
  );
}

function SportPanel({ label, sub, className }: { label: string; sub: string; className: string }) {
  return <div className={`relative overflow-hidden ${className}`}><div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_55%_28%,white_0,transparent_18%),radial-gradient(ellipse_at_55%_75%,#d6e4ef_0,transparent_36%)]" /><div className="absolute bottom-8 left-7 whitespace-pre-line text-xl font-black leading-5 text-white drop-shadow">{label}<span className="mt-2 block text-xs font-bold">{sub}</span></div></div>;
}

function SearchField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div><p className="mb-1 text-xs font-bold">{label}</p><div className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-4 text-sm text-slate-400">{<span className="[&>svg]:size-5 [&>svg]:text-[#09213f]">{icon}</span>}{value}</div></div>;
}

function TrainerCard({ trainer, index, locale }: { trainer: (typeof trainers)[number]; index: number; locale: Locale }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex gap-4"><div className={`grid h-40 w-32 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${trainer.tone} text-5xl text-white/80`}>{index === 1 ? "✦" : "●"}</div><div className="min-w-0 py-1"><h3 className="flex items-center gap-1 text-lg font-bold">{trainer.name}<BadgeCheck className="size-5 fill-blue-600 text-white" /></h3><p className="mt-1 text-sm text-slate-600">{trainer.sport}</p><p className="mt-5 flex gap-1 text-xs text-slate-600"><MapPin className="size-4 shrink-0" />{trainer.area}</p><p className="mt-2 text-sm"><Star className="mr-1 inline size-5 fill-amber-400 text-amber-400" /><b>{trainer.rating}</b> <span className="text-slate-400">({trainer.reviews})</span></p></div></div><p className="mt-4 text-center text-lg font-extrabold">{trainer.price}〜<span className="text-sm font-normal text-slate-500"> / 60分</span></p><div className="mt-3 flex justify-center gap-2 text-xs font-bold"><span className="rounded bg-slate-100 px-3 py-2">本日 18:00</span><span className="rounded bg-slate-100 px-3 py-2">4/26（土）</span><span className="rounded bg-slate-100 px-3 py-2">4/27（日）</span></div><Link href={`/${locale}/trainers`} className="mt-4 block rounded-md border border-blue-600 py-2 text-center text-sm font-bold text-blue-700 hover:bg-blue-50">プロフィールを見る</Link></article>;
}

function Step({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="text-center"><div className="mx-auto mb-3 grid size-14 place-items-center text-blue-700 [&>svg]:size-10">{icon}</div><h3 className="text-xl font-extrabold">{title}</h3><p className="mx-auto mt-3 max-w-48 text-sm leading-6 text-slate-600">{body}</p></div>;
}
