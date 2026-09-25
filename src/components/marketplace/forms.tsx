import type { ReactNode } from "react";
import { mutate } from "@/app/[locale]/dashboard/workspace/actions";
import type { Locale } from "@/lib/constants/locales";
import { SubmitButton } from "./submit-button";
export const inputClass =
  "w-full min-h-12 rounded-xl border border-slate-400 bg-white px-3 py-3 text-base";
export function Field({
  label,
  name,
  value,
  type = "text",
  required,
  min,
  max,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  min?: number | string;
  max?: number | string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>
        {label}
        {required && (
          <span className="ml-2 text-red-700" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {type === "textarea" ? (
        <textarea
          className={inputClass}
          name={name}
          defaultValue={value ?? ""}
          rows={3}
          maxLength={4000}
          required={required}
        />
      ) : (
        <input
          className={inputClass}
          name={name}
          type={type}
          defaultValue={value ?? ""}
          required={required}
          min={min}
          max={max}
          maxLength={type === "url" ? 2048 : 500}
        />
      )}
    </label>
  );
}
export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
export function Form({
  locale,
  op,
  id,
  tab,
  booking,
  children,
  submit,
}: {
  locale: Locale;
  op: string;
  id?: string;
  tab?: string;
  booking?: string;
  children?: ReactNode;
  submit?: string;
}) {
  return (
    <form action={mutate.bind(null, locale)} className="grid gap-4">
      <Hidden name="op" value={op} />
      {id && <Hidden name="id" value={id} />}
      <Hidden name="tab" value={tab ?? ""} />
      {booking && <Hidden name="returnBooking" value={booking} />} {children}
      <SubmitButton
        label={submit ?? (locale === "ja" ? "保存" : "Save")}
        pendingLabel={locale === "ja" ? "処理中…" : "Saving…"}
      />
    </form>
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="workspace-panel space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
export function Notice({
  locale,
  error,
  saved,
}: {
  locale: Locale;
  error?: string;
  saved?: string;
}) {
  return error ? (
    <p
      role="alert"
      className="rounded-xl border-l-4 border-red-600 bg-red-50 p-4 text-red-900"
    >
      {locale === "ja"
        ? "処理できませんでした。入力内容・予約の空き・操作できる状態かを確認し、再度お試しください。解決しない場合はサポートへお問い合わせください。"
        : "Unable to complete this action. Check the inputs, availability and current status, then retry or contact support."}
    </p>
  ) : saved ? (
    <p
      role="status"
      className="rounded-xl border-l-4 border-green-600 bg-green-50 p-4 text-green-900"
    >
      {locale === "ja"
        ? "処理を受け付けました。決済の反映には時間がかかる場合があります。"
        : "Request received. Payments may take a moment to update."}
    </p>
  ) : null;
}
