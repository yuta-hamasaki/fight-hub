import type { Locale } from "@/lib/constants/locales";

export const dictionary = {
  en: {
    appName: "Fight Hub",
    tagline: "Build your fitness marketplace faster.",
    welcome: "Initial setup is ready.",
    switchLanguage: "Language",
  },
  ja: {
    appName: "Fight Hub",
    tagline: "フィットネスマーケットプレイスを素早く構築。",
    welcome: "初期セットアップが完了しました。",
    switchLanguage: "言語",
  },
} satisfies Record<Locale, Record<string, string>>;
