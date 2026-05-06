/**
 * Cadence model — see openspec D1.
 *
 * `weekdays` uses JS Date#getDay() semantics (0=Sun .. 6=Sat) — same as
 * `weekdayInTaipei()` from `./taipei`. UI labels say "Mon Tue ..." but the
 * stored numbers are always the JS convention.
 */

export type RoutineCadence = {
  cadenceType: 'daily' | 'weekdays';
  weekdays: number[] | null;
};

/**
 * True if a routine's cadence applies on the given Taipei calendar date.
 * `date` MUST be a YYYY-MM-DD string (the format `todayInTaipei` returns).
 */
export function appliesOn(routine: RoutineCadence, date: string): boolean {
  if (routine.cadenceType === 'daily') return true;
  if (!routine.weekdays?.length) return false;
  // Treat the YYYY-MM-DD string as a UTC midnight timestamp; getUTCDay
  // gives the same weekday number as if the date were a Taipei calendar day.
  const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
  return routine.weekdays.includes(weekday);
}
