"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
export default function PageError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const params = useParams();
  const locale = params.locale === "en" ? "en" : "ja";
  const ja = locale === "ja";
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-white p-6 sm:p-10">
      <AlertCircle aria-hidden="true" className="mb-5 size-10 text-amber-700" />
      <h1 className="text-2xl font-bold">
        {ja ? "ページを読み込めませんでした" : "We couldn’t load this page"}
      </h1>
      <p className="my-5 text-slate-600">
        {ja
          ? "通信状況を確認して、もう一度お試しください。解決しない場合は、時間をおいてアクセスしてください。"
          : "Check your connection and try again. If the problem continues, please return later."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => unstable_retry()}>
          {ja ? "もう一度読み込む" : "Try again"}
        </Button>
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
