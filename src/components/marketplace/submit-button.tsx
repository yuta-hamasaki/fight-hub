"use client";
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
    <button
      disabled={pending}
      className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
