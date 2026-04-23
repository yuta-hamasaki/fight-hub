"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type Offering = {
  id: string;
  title: string;
  durationMinutes: number;
  price: string;
};

type Props = {
  offerings: Offering[];
  action: (formData: FormData) => Promise<void>;
  copy: {
    button: string;
    startsAt: string;
    timezone: string;
  };
};

export function SessionBookingForm({ offerings, action, copy }: Props) {
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  return (
    <form action={action} className="grid gap-3">
      <select name="sessionOfferingId" required className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm">
        {offerings.map((offering) => (
          <option key={offering.id} value={offering.id}>
            {offering.title} · {offering.durationMinutes}m · {offering.price}
          </option>
        ))}
      </select>
      <label className="grid gap-1 text-sm">
        {copy.startsAt}
        <input
          name="startsAtLocal"
          type="datetime-local"
          required
          value={dateTimeLocal}
          onChange={(event) => setDateTimeLocal(event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-3 py-2"
        />
      </label>
      <input type="hidden" name="startsAtUtc" value={dateTimeLocal ? new Date(dateTimeLocal).toISOString() : ""} />
      <label className="grid gap-1 text-sm">
        {copy.timezone}
        <input name="timezone" value={timezone} readOnly className="rounded-md border border-blue-100 bg-slate-50 px-3 py-2" />
      </label>
      <Button type="submit">{copy.button}</Button>
    </form>
  );
}
