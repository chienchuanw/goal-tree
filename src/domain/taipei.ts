export const TAIPEI_TZ = 'Asia/Taipei' as const;

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TAIPEI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TAIPEI_TZ,
  weekday: 'short',
});

const dateLabelFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TAIPEI_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** Formats a Date as an upper-case Taipei calendar label like "07 MAY 2026". */
export function formatTaipeiDateLabel(d: Date | null | undefined): string {
  if (!d) return '';
  return dateLabelFmt.format(d).toUpperCase();
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Returns the calendar day in Asia/Taipei for the given instant, formatted YYYY-MM-DD. */
export function todayInTaipei(now: Date = new Date()): string {
  // en-CA produces YYYY-MM-DD natively.
  return dateFmt.format(now);
}

/** Returns 0 (Sun) .. 6 (Sat) for the Taipei weekday of the given instant. */
export function weekdayInTaipei(now: Date = new Date()): number {
  const short = weekdayFmt.format(now); // "Tue"
  return WEEKDAY_INDEX[short];
}

/**
 * True if `targetDate` (YYYY-MM-DD) is within [today-2, today] in Taipei.
 * Future dates are always rejected.
 */
export function isWithinBackfillWindow(targetDate: string, now: Date = new Date()): boolean {
  const today = todayInTaipei(now);
  const t = Date.parse(targetDate + 'T00:00:00Z');
  const td = Date.parse(today + 'T00:00:00Z');
  if (Number.isNaN(t) || Number.isNaN(td)) return false;
  const diffDays = Math.round((td - t) / 86_400_000);
  return diffDays >= 0 && diffDays <= 2;
}

/**
 * Converts a naive `<input type="datetime-local">` value (e.g. `"2026-06-01T23:59"`,
 * with no timezone) into an ISO string treated as Asia/Taipei wall-clock.
 * Taipei has no DST so the offset is always `+08:00`.
 * Returns `''` for empty input.
 */
export function naiveDateTimeToTaipeiIso(value: string): string {
  if (!value) return '';
  return `${value}:00+08:00`;
}
