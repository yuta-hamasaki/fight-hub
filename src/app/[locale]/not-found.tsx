"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
export default function NotFound() {
  const params = useParams();
  const locale = params.locale === "en" ? "en" : "ja";
  const ja = locale === "ja";
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-white p-6 sm:p-10">
      <Search aria-hidden="true" className="mb-5 size-10 text-blue-700" />
      <p className="mb-2 text-sm font-semibold text-slate-500">404</p>
      <h1 className="text-2xl font-bold">
        {ja ? "ページが見つかりません" : "Page not found"}
      </h1>
      <p className="my-5 text-slate-600">
        {ja
          ? "ページが移動したか、公開が終了した可能性があります。トレーナー一覧からお探しください。"
          : "This page may have moved or is no longer available. Browse trainers to keep exploring."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/${locale}/trainers`} className={buttonVariants()}>
          {ja ? "トレーナーを探す" : "Find a trainer"}
        </Link>
        <Link
          href={`/${locale}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {ja ? "ホームに戻る" : "Back to home"}
        </Link>
      </div>
    </section>
  );
}
