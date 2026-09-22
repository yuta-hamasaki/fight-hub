"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { inputClass } from "./styles";
export function SlotPicker({
  offeringId,
  ja,
  bookingId,
}: {
  offeringId: string;
  ja: boolean;
  bookingId?: string;
}) {
  const timezone = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    () => "UTC",
  );
  const [day, setDay] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [selected, setSelected] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!day || !offeringId) return;
    const controller = new AbortController();
    fetch(
      `/api/availability?${new URLSearchParams({ offering: offeringId, day, timezone, ...(bookingId ? { booking: bookingId } : {}) })}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setSlots(data.slots);
        setError(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [day, offeringId, timezone, bookingId]);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-slate-600">
        {ja ? "表示タイムゾーン" : "Time zone"}: {timezone}
      </p>
      <input type="hidden" name="timezone" value={timezone} />
      <label className="grid gap-1 text-sm">
        {ja ? "希望日" : "Date"}
        <input
          className={inputClass}
          type="date"
          required
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            setSelected("");
            setSlots([]);
            setLoading(true);
            setError(false);
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        {ja ? "予約できる時間" : "Available time"}
        <select
          className={inputClass}
          name="startsAtUtc"
          required
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={loading || !day}
        >
          <option value="">
            {loading
              ? ja
                ? "確認中…"
                : "Loading…"
              : ja
                ? "時間を選択"
                : "Select a time"}
          </option>
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", {
                timeZone: timezone,
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
              }).format(new Date(slot))}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert">
          {ja
            ? "空き枠を取得できません。日付を選び直してください。"
            : "Unable to load times. Select a date again."}
        </p>
      ) : day && !loading && !slots.length ? (
        <p role="status" className="text-sm">
          {ja
            ? "この日の空き枠はありません。別の日をお選びください。"
            : "No available times. Choose another day."}
        </p>
      ) : null}
    </div>
  );
}
