"use client";
import { useState } from "react";
import { SlotPicker } from "@/components/marketplace/slot-picker";
import { SubmitButton } from "@/components/marketplace/submit-button";
type Offering = {
  id: string;
  title: string;
  durationMinutes: number;
  price: string;
};
export function SessionBookingForm({
  offerings,
  action,
  copy,
  passes = [],
  initialOfferingId,
}: {
  offerings: Offering[];
  action: (formData: FormData) => Promise<void>;
  copy: { button: string; startsAt: string; timezone: string };
  passes?: {
    id: string;
    offeringId: string;
    title: string;
    remaining: number;
  }[];
  initialOfferingId?: string;
}) {
  const [offeringId, setOfferingId] = useState(
    offerings.some((o) => o.id === initialOfferingId)
      ? initialOfferingId!
      : (offerings[0]?.id ?? ""),
  );
  const [passId, setPassId] = useState("");
  const ja = /[\u3040-\u30ff\u3400-\u9fff]/.test(copy.button);
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        {ja ? "セッション" : "Session"}
        <select
          name="sessionOfferingId"
          required
          value={offeringId}
          onChange={(e) => {
            setOfferingId(e.target.value);
            setPassId("");
          }}
          className="rounded-lg border bg-white p-2"
        >
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} · {o.durationMinutes}m · {o.price}
            </option>
          ))}
        </select>
      </label>
      <SlotPicker key={offeringId} offeringId={offeringId} ja={ja} />
      {passes.some((p) => p.offeringId === offeringId && p.remaining > 0) && (
        <>
          <label className="grid gap-1 text-sm">
            {ja ? "支払い方法" : "Payment"}
            <select
              className="rounded-lg border bg-white p-2"
              name="passId"
              value={passId}
              onChange={(e) => setPassId(e.target.value)}
            >
              <option value="">{ja ? "カードで支払う" : "Pay by card"}</option>
              {passes
                .filter((p) => p.offeringId === offeringId && p.remaining > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.remaining} {ja ? "回残り" : "credits"}
                  </option>
                ))}
            </select>
          </label>
          {passId && (
            <label className="grid gap-1 text-sm">
              {ja
                ? "毎週同じ曜日・時間で予約する回数（全日程に空きが必要）"
                : "Weekly sessions at the same local time (all dates must be available)"}
              <input
                className="rounded-lg border bg-white p-2"
                type="number"
                name="count"
                min={1}
                max={Math.min(
                  12,
                  passes.find((p) => p.id === passId)?.remaining ?? 1,
                )}
                defaultValue={1}
              />
            </label>
          )}
        </>
      )}
      <SubmitButton
        label={
          passId
            ? ja
              ? "回数券で予約する"
              : "Book using credits"
            : copy.button
        }
        pendingLabel={ja ? "予約中…" : "Booking…"}
      />
    </form>
  );
}
