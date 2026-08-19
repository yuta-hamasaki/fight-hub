export type AvailabilityWindow = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type BookingInterval = {
  startsAt: Date;
  endsAt: Date;
};

export function intervalsOverlap(left: BookingInterval, right: BookingInterval) {
  return left.startsAt < right.endsAt && left.endsAt > right.startsAt;
}

export function isWithinAvailability(
  interval: BookingInterval,
  windows: AvailabilityWindow[],
) {
  if (windows.length === 0) return true;
  if (interval.startsAt.getUTCDate() !== interval.endsAt.getUTCDate()) return false;

  const dayOfWeek = interval.startsAt.getUTCDay();
  const startMinute = interval.startsAt.getUTCHours() * 60 + interval.startsAt.getUTCMinutes();
  const endMinute = interval.endsAt.getUTCHours() * 60 + interval.endsAt.getUTCMinutes();

  return windows.some(
    (window) =>
      window.dayOfWeek === dayOfWeek &&
      startMinute >= window.startMinute &&
      endMinute <= window.endMinute,
  );
}
