import { TAIPEI_TZ, todayInTaipei } from './taipei';

const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function dayInTz(d: Date, tz: string): string {
  if (tz === TAIPEI_TZ) return todayInTaipei(d);
  let fmt = FORMATTER_CACHE.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    FORMATTER_CACHE.set(tz, fmt);
  }
  return fmt.format(d);
}

/**
 * Calendar-day delta between `deadlineAt` and `now` in the given IANA timezone.
 * Positive: deadline is in the future. Negative: deadline already passed.
 * Defaults to Asia/Taipei.
 */
export function daysUntil(
  deadlineAt: Date,
  now: Date,
  tz: string = TAIPEI_TZ,
): number {
  const a = Date.parse(dayInTz(deadlineAt, tz) + 'T00:00:00Z');
  const b = Date.parse(dayInTz(now, tz) + 'T00:00:00Z');
  return Math.round((a - b) / 86_400_000);
}

/**
 * Wall-clock hours/minutes remaining until `deadlineAt`.
 * Both fields clamp to 0 when `deadlineAt <= now`.
 */
export function hoursMinutesUntil(
  deadlineAt: Date,
  now: Date,
): { hours: number; minutes: number } {
  const ms = deadlineAt.getTime() - now.getTime();
  if (ms <= 0) return { hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}
