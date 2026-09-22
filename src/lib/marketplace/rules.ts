export const dayMs = 86400000;
export function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
export function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    day,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: new Date(`${day}T12:00:00Z`).getUTCDay(),
  };
}
export function localToUtc(value: string, timezone: string) {
  if (
    !validTimezone(timezone) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  )
    throw new Error("Invalid date or timezone");
  const target = new Date(`${value}:00Z`).getTime();
  if (!Number.isFinite(target)) throw new Error("Invalid date");
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const p = localParts(new Date(guess), timezone);
    const actual = new Date(
      `${p.day}T${String(Math.floor(p.minute / 60)).padStart(2, "0")}:${String(p.minute % 60).padStart(2, "0")}:00Z`,
    ).getTime();
    guess += target - actual;
  }
  const p = localParts(new Date(guess), timezone);
  if (
    `${p.day}T${String(Math.floor(p.minute / 60)).padStart(2, "0")}:${String(p.minute % 60).padStart(2, "0")}` !==
    value
  )
    throw new Error("This local time does not exist");
  return new Date(guess);
}
export function weeklyDates(first: Date, count: number, timezone: string) {
  if (!Number.isInteger(count) || count < 1 || count > 12)
    throw new Error("Choose 1–12 sessions");
  const p = localParts(first, timezone);
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(
      new Date(`${p.day}T12:00:00Z`).getTime() + i * 7 * dayMs,
    )
      .toISOString()
      .slice(0, 10);
    return i === 0
      ? first
      : localToUtc(
          `${day}T${String(Math.floor(p.minute / 60)).padStart(2, "0")}:${String(p.minute % 60).padStart(2, "0")}`,
          timezone,
        );
  });
}
export function canFinishBooking(
  status: string,
  endsAt: Date,
  now = new Date(),
) {
  return status === "CONFIRMED" && endsAt <= now;
}
export function refundable(
  booking: { startsAt: Date; cancelBefore: Date | null },
  trainer: boolean,
  now = new Date(),
) {
  return trainer || now <= (booking.cancelBefore ?? booking.startsAt);
}
export function safeUrl(value: string) {
  if (!value.trim()) return null;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Use an HTTPS URL");
  return url.toString();
}
