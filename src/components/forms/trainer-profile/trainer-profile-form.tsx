"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/constants/locales";
import type { TrainerProfileFormState, TrainerProfileFormValues } from "./types";

type TrainerProfileFormCopy = {
  title: string;
  description: string;
  save: string;
  saved: string;
  formTip: string;
  basicInfo: string;
  bios: string;
  categoriesAndLanguages: string;
  credibility: string;
  coaching: string;
  socialLinks: string;
};

type TrainerProfileFormProps = {
  locale: Locale;
  copy: TrainerProfileFormCopy;
  initialValues: TrainerProfileFormValues;
  initialState: TrainerProfileFormState;
  action: (state: TrainerProfileFormState, formData: FormData) => Promise<TrainerProfileFormState>;
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="font-medium">{title}</h3>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function listPlaceholder(locale: Locale) {
  return locale === "ja"
    ? "1行1項目、またはカンマ区切りで入力"
    : "One item per line, or comma-separated";
}

export function TrainerProfileForm({
  locale,
  copy,
  initialValues,
  initialState,
  action,
}: TrainerProfileFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.formTip}</p>
      </div>

      <Section title={copy.basicInfo}>
        <Field id="displayName" label="Display name / 表示名" error={state.fieldErrors.displayName}>
          <Input id="displayName" name="displayName" required defaultValue={initialValues.displayName} />
        </Field>
        <Field
          id="displayNameJa"
          label="Display name (Japanese) / 表示名（日本語）"
          error={state.fieldErrors.displayNameJa}
        >
          <Input id="displayNameJa" name="displayNameJa" defaultValue={initialValues.displayNameJa} />
        </Field>
        <Field
          id="profileImageUrl"
          label="Profile image URL / プロフィール画像URL （任意・optional）"
          error={state.fieldErrors.profileImageUrl}
        >
          <Input
            id="profileImageUrl"
            name="profileImageUrl"
            type="url"
            placeholder="https://example.com/profile.jpg"
            defaultValue={initialValues.profileImageUrl}
          />
        </Field>
      </Section>

      <Section title={copy.bios}>
        <Field id="shortBio" label="Short bio (EN)" error={state.fieldErrors.shortBio}>
          <Textarea id="shortBio" name="shortBio" maxLength={160} defaultValue={initialValues.shortBio} />
        </Field>
        <Field id="shortBioJa" label="Short bio (JA)">
          <Textarea id="shortBioJa" name="shortBioJa" maxLength={160} defaultValue={initialValues.shortBioJa} />
        </Field>
        <Field id="longBio" label="Long bio (EN)" error={state.fieldErrors.longBio}>
          <Textarea id="longBio" name="longBio" maxLength={3000} defaultValue={initialValues.longBio} />
        </Field>
        <Field id="longBioJa" label="Long bio (JA)">
          <Textarea id="longBioJa" name="longBioJa" maxLength={3000} defaultValue={initialValues.longBioJa} />
        </Field>
      </Section>

      <Section title={copy.categoriesAndLanguages}>
        <Field id="categories" label="Categories / カテゴリー" error={state.fieldErrors.categories}>
          <Textarea
            id="categories"
            name="categories"
            placeholder={listPlaceholder(locale)}
            defaultValue={initialValues.categories.join("\n")}
          />
        </Field>
        <Field id="languages" label="Languages / 対応言語" error={state.fieldErrors.languages}>
          <Textarea
            id="languages"
            name="languages"
            placeholder={listPlaceholder(locale)}
            defaultValue={initialValues.languages.join("\n")}
          />
        </Field>
      </Section>

      <Section title={copy.credibility}>
        <Field id="achievements" label="Achievements / 実績" error={state.fieldErrors.achievements}>
          <Textarea
            id="achievements"
            name="achievements"
            placeholder={listPlaceholder(locale)}
            defaultValue={initialValues.achievements.join("\n")}
          />
        </Field>
        <Field id="certifications" label="Certifications / 資格" error={state.fieldErrors.certifications}>
          <Textarea
            id="certifications"
            name="certifications"
            placeholder={listPlaceholder(locale)}
            defaultValue={initialValues.certifications.join("\n")}
          />
        </Field>
      </Section>

      <Section title={copy.coaching}>
        <Field id="coachingFormats" label="Coaching format / 指導形式" error={state.fieldErrors.coachingFormats}>
          <Textarea
            id="coachingFormats"
            name="coachingFormats"
            placeholder={listPlaceholder(locale)}
            defaultValue={initialValues.coachingFormats.join("\n")}
          />
        </Field>
      </Section>

      <Section title={copy.socialLinks}>
        <Field id="socialWebsite" label="Website" error={state.fieldErrors.socialWebsite}>
          <Input id="socialWebsite" name="socialWebsite" type="url" defaultValue={initialValues.socialWebsite} />
        </Field>
        <Field id="socialInstagram" label="Instagram" error={state.fieldErrors.socialInstagram}>
          <Input
            id="socialInstagram"
            name="socialInstagram"
            type="url"
            defaultValue={initialValues.socialInstagram}
          />
        </Field>
        <Field id="socialX" label="X (Twitter)" error={state.fieldErrors.socialX}>
          <Input id="socialX" name="socialX" type="url" defaultValue={initialValues.socialX} />
        </Field>
        <Field id="socialYoutube" label="YouTube" error={state.fieldErrors.socialYoutube}>
          <Input id="socialYoutube" name="socialYoutube" type="url" defaultValue={initialValues.socialYoutube} />
        </Field>
      </Section>

      {state.message ? (
        <p className={state.status === "success" ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {state.status === "success" ? copy.saved : state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? `${copy.save}...` : copy.save}
      </Button>
    </form>
  );
}
