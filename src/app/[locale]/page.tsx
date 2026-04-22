import { ArrowRight, CheckCircle2, Coins, Globe2, Handshake, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { LandingSection } from "@/components/marketing/landing-section";
import { ValueCard } from "@/components/marketing/value-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";
import { cn } from "@/lib/utils";


interface LandingPageCopy {
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  clients: {
    title: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };
  trainers: {
    title: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };
  categories: {
    title: string;
    description: string;
    items: string[];
  };
  howItWorks: {
    title: string;
    description: string;
    steps: Array<{ title: string; description: string }>;
  };
  monetization: {
    title: string;
    description: string;
    items: string[];
  };
  bilingual: {
    title: string;
    description: string;
    points: string[];
  };
  cta: {
    title: string;
    description: string;
    primary: string;
    secondary: string;
  };
  faq: {
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
  footer: {
    headline: string;
    tagline: string;
    links: string[];
    copyright: string;
  };
}

const landingCopy = {
  en: {
    hero: {
      badge: "Built for modern martial arts businesses",
      title: "Grow your martial arts marketplace with trust and speed.",
      description:
        "Fight Hub helps clients find the right coach while helping trainers monetize sessions, memberships, and programs in one bilingual platform.",
      primaryCta: "Start as a trainer",
      secondaryCta: "Book your first class",
    },
    clients: {
      title: "Value proposition for clients",
      description: "Discover high-quality trainers fast, compare options clearly, and book with confidence.",
      items: [
        {
          title: "Verified trainer profiles",
          description: "Ratings, credentials, and specialties are shown upfront so clients can make smarter decisions.",
        },
        {
          title: "Simple booking flow",
          description: "From search to payment, clients can reserve classes in minutes on mobile or desktop.",
        },
        {
          title: "Flexible lesson formats",
          description: "Offerings include private sessions, group classes, and online coaching to fit any schedule.",
        },
      ],
    },
    trainers: {
      title: "Value proposition for trainers",
      description: "Launch quickly, reach qualified students, and operate with less admin work.",
      items: [
        {
          title: "Faster lead generation",
          description: "A conversion-focused profile helps serious clients find and contact you faster.",
        },
        {
          title: "Automated scheduling",
          description: "Availability, confirmations, and reminders keep your calendar organized.",
        },
        {
          title: "Built-in trust signals",
          description: "Client reviews and profile verification increase confidence and conversions.",
        },
      ],
    },
    categories: {
      title: "Martial arts categories",
      description: "Organized discovery for every training style.",
      items: ["Boxing", "Kickboxing", "Muay Thai", "Brazilian Jiu-Jitsu", "MMA", "Judo", "Karate", "Wrestling"],
    },
    howItWorks: {
      title: "How it works",
      description: "A simple journey from discovery to recurring training.",
      steps: [
        {
          title: "1. Explore",
          description: "Clients browse by style, level, location, and language.",
        },
        {
          title: "2. Match",
          description: "They compare trainer profiles, pricing, and available times.",
        },
        {
          title: "3. Train",
          description: "Book instantly, pay securely, and continue with subscriptions.",
        },
      ],
    },
    monetization: {
      title: "Monetization for trainers",
      description: "Multiple revenue streams in one platform.",
      items: [
        "Sell one-on-one sessions or drop-in classes",
        "Create monthly memberships with recurring billing",
        "Launch premium programs for competition prep",
        "Upsell digital plans and video feedback",
      ],
    },
    bilingual: {
      title: "Bilingual / international support",
      description:
        "Fight Hub supports Japanese and English experiences so you can serve local and global communities without duplicating operations.",
      points: [
        "Localized user journey in English and Japanese",
        "International-friendly onboarding and communication",
        "Consistent branding across both languages",
      ],
    },
    cta: {
      title: "Ready to grow your martial arts business?",
      description: "Join Fight Hub and start turning profile views into paid students.",
      primary: "Create trainer account",
      secondary: "Talk to sales",
    },
    faq: {
      title: "FAQ",
      items: [
        {
          question: "Can I offer both private and group classes?",
          answer: "Yes. Trainers can publish multiple lesson formats and set independent pricing for each.",
        },
        {
          question: "Does Fight Hub support Japanese and English users?",
          answer: "Yes. The platform is designed for bilingual experiences and international expansion.",
        },
        {
          question: "How do trainers get paid?",
          answer: "Payments are handled securely, with recurring options for memberships and program plans.",
        },
      ],
    },
    footer: {
      headline: "Fight Hub",
      tagline: "Modern marketplace infrastructure for martial arts.",
      links: ["Privacy", "Terms", "Contact"],
      copyright: "© 2026 Fight Hub. All rights reserved.",
    },
  },
  ja: {
    hero: {
      badge: "武道ビジネスのためのモダンプラットフォーム",
      title: "信頼とスピードで、あなたの格闘技マーケットプレイスを成長させる。",
      description:
        "Fight Hub は、クライアントが最適なコーチを見つけやすくし、トレーナーはセッション・会員課金・プログラムを1つのバイリンガル基盤で収益化できます。",
      primaryCta: "トレーナーとして始める",
      secondaryCta: "最初のレッスンを予約",
    },
    clients: {
      title: "クライアント向けの価値",
      description: "質の高いトレーナーを素早く比較し、安心して予約できます。",
      items: [
        {
          title: "検証済みトレーナープロフィール",
          description: "評価・実績・専門分野を事前に確認でき、納得して選べます。",
        },
        {
          title: "シンプルな予約体験",
          description: "検索から決済まで、モバイルでもPCでも短時間で完了します。",
        },
        {
          title: "柔軟なレッスン形式",
          description: "パーソナル、グループ、オンライン指導までニーズに合わせて選択可能です。",
        },
      ],
    },
    trainers: {
      title: "トレーナー向けの価値",
      description: "短期間で立ち上げ、質の高い生徒に届き、運用負荷を下げられます。",
      items: [
        {
          title: "集客スピードを向上",
          description: "コンバージョン重視のプロフィールで本気度の高い顧客に届きます。",
        },
        {
          title: "スケジュールを自動化",
          description: "空き枠管理、予約確定、リマインドを自動化して効率化します。",
        },
        {
          title: "信頼を高める仕組み",
          description: "レビューと認証情報により、問い合わせと成約を後押しします。",
        },
      ],
    },
    categories: {
      title: "対応する格闘技カテゴリ",
      description: "あらゆるスタイルを探しやすく分類。",
      items: ["ボクシング", "キックボクシング", "ムエタイ", "ブラジリアン柔術", "MMA", "柔道", "空手", "レスリング"],
    },
    howItWorks: {
      title: "利用の流れ",
      description: "発見から継続トレーニングまで、わかりやすい3ステップ。",
      steps: [
        {
          title: "1. 探す",
          description: "種目、レベル、エリア、言語でトレーナーを絞り込み。",
        },
        {
          title: "2. 比較する",
          description: "プロフィール、料金、空き時間を見比べて最適な相手を選択。",
        },
        {
          title: "3. 継続する",
          description: "予約・決済を簡単に行い、サブスクで継続的に受講。",
        },
      ],
    },
    monetization: {
      title: "トレーナーの収益化",
      description: "ひとつのプラットフォームで複数の売上導線を構築。",
      items: [
        "パーソナル/単発クラスを販売",
        "月額会員プランで継続課金",
        "試合向けプレミアムプログラムを提供",
        "デジタル指導プランや動画フィードバックを追加販売",
      ],
    },
    bilingual: {
      title: "バイリンガル / 国際対応",
      description:
        "Fight Hub は日本語と英語の両方に対応し、運用を分けることなく国内外のコミュニティへ展開できます。",
      points: [
        "英語・日本語で統一されたUX",
        "国際ユーザーを想定したオンボーディング",
        "多言語でも一貫したブランド表現",
      ],
    },
    cta: {
      title: "格闘技ビジネスを次の成長段階へ。",
      description: "Fight Hub で、プロフィール閲覧を有料受講につなげましょう。",
      primary: "トレーナーアカウントを作成",
      secondary: "営業に相談する",
    },
    faq: {
      title: "よくある質問",
      items: [
        {
          question: "パーソナルとグループの両方を提供できますか？",
          answer: "はい。レッスン形式ごとに掲載・料金設定が可能です。",
        },
        {
          question: "日本語と英語のユーザーに対応できますか？",
          answer: "はい。プラットフォーム全体がバイリンガル対応を前提に設計されています。",
        },
        {
          question: "トレーナーへの支払いはどうなりますか？",
          answer: "安全な決済基盤で、月額課金やプログラム販売にも対応できます。",
        },
      ],
    },
    footer: {
      headline: "Fight Hub",
      tagline: "格闘技のためのモダンなマーケットプレイス基盤。",
      links: ["プライバシー", "利用規約", "お問い合わせ"],
      copyright: "© 2026 Fight Hub. All rights reserved.",
    },
  },
} satisfies Record<Locale, LandingPageCopy>;

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = landingCopy[locale];

  return (
    <div className="space-y-16 pb-8 md:space-y-24">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white px-6 py-12 shadow-sm md:px-10 md:py-16">
        <p className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
          {copy.hero.badge}
        </p>
        <div className="mt-5 max-w-3xl space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">{copy.hero.title}</h1>
          <p className="text-base leading-relaxed text-slate-600 md:text-lg">{copy.hero.description}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/${locale}/sign-up`} className={cn(buttonVariants({ size: "lg" }), "bg-blue-600 text-white hover:bg-blue-700")}>
            {copy.hero.primaryCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/${locale}/sign-in`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {copy.hero.secondaryCta}
          </Link>
        </div>
      </section>

      <LandingSection id="clients" title={copy.clients.title} description={copy.clients.description}>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.clients.items.map((item) => (
            <ValueCard
              key={item.title}
              title={item.title}
              description={item.description}
              icon={<Users className="h-5 w-5" />}
            />
          ))}
        </div>
      </LandingSection>

      <LandingSection id="trainers" title={copy.trainers.title} description={copy.trainers.description}>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.trainers.items.map((item) => (
            <ValueCard
              key={item.title}
              title={item.title}
              description={item.description}
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          ))}
        </div>
      </LandingSection>

      <LandingSection id="categories" title={copy.categories.title} description={copy.categories.description}>
        <div className="flex flex-wrap gap-3">
          {copy.categories.items.map((category) => (
            <span
              key={category}
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
            >
              {category}
            </span>
          ))}
        </div>
      </LandingSection>

      <LandingSection id="how-it-works" title={copy.howItWorks.title} description={copy.howItWorks.description}>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.howItWorks.steps.map((step) => (
            <Card key={step.title} className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </LandingSection>

      <LandingSection id="monetization" title={copy.monetization.title} description={copy.monetization.description}>
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {copy.monetization.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <Coins className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </LandingSection>

      <LandingSection id="bilingual" title={copy.bilingual.title} description={copy.bilingual.description}>
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <Globe2 className="h-5 w-5 text-blue-600" />
                Global ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {copy.bilingual.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-blue-100 bg-blue-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Handshake className="h-5 w-5" />
                {locale === "ja" ? "海外顧客との接点を拡大" : "Expand your cross-border reach"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-100">
                {locale === "ja"
                  ? "言語切替と一貫した体験設計で、国内外の会員を同時に獲得しやすくなります。"
                  : "Language switching and consistent UX make it easier to attract both local and international members."}
              </p>
            </CardContent>
          </Card>
        </div>
      </LandingSection>

      <section className="rounded-3xl bg-slate-900 px-6 py-12 text-white md:px-10">
        <h2 className="text-2xl font-semibold md:text-3xl">{copy.cta.title}</h2>
        <p className="mt-3 max-w-3xl text-slate-300">{copy.cta.description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/${locale}/sign-up`} className={cn(buttonVariants({ size: "lg" }), "bg-blue-500 text-white hover:bg-blue-400")}>
            {copy.cta.primary}
          </Link>
          <Link href={`/${locale}/sign-in`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-slate-500 text-white hover:bg-slate-800")}>
            {copy.cta.secondary}
          </Link>
        </div>
      </section>

      <LandingSection id="faq" title={copy.faq.title}>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.faq.items.map((item) => (
            <Card key={item.question} className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </LandingSection>

      <footer className="border-t border-slate-200 pt-8 text-sm text-slate-500">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{copy.footer.headline}</p>
            <p>{copy.footer.tagline}</p>
          </div>
          <div className="flex items-center gap-4">
            {copy.footer.links.map((link) => (
              <span key={link}>{link}</span>
            ))}
          </div>
        </div>
        <p className="mt-6">{copy.footer.copyright}</p>
      </footer>
    </div>
  );
}
