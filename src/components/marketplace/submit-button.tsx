"use client";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
export function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} aria-busy={pending} className="w-full sm:w-fit">
      {pending ? pendingLabel : label}
    </Button>
  );
}
