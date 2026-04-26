"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Locale } from "@/lib/constants/locales";

import { startStripeRegistration } from "./actions";

function SubmitButton({
  idleLabel,
  loadingLabel,
}: {
  idleLabel: string;
  loadingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Spinner className="size-4" />
          {loadingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}

export function StripeOnboardingButton({
  locale,
  idleLabel,
  loadingLabel,
}: {
  locale: Locale;
  idleLabel: string;
  loadingLabel: string;
}) {
  return (
    <form action={startStripeRegistration.bind(null, locale)}>
      <SubmitButton idleLabel={idleLabel} loadingLabel={loadingLabel} />
    </form>
  );
}
