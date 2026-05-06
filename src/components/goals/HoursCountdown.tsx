'use client';

import { useEffect, useState } from 'react';
import { daysUntil, hoursMinutesUntil } from '@/domain/countdown';
import { CountdownBadge } from './CountdownBadge';

type Props = {
  deadlineAt: string; // ISO 8601
};

const TICK_MS = 60_000;

export function HoursCountdown({ deadlineAt }: Props) {
  const deadline = new Date(deadlineAt);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const days = daysUntil(deadline, now);
  if (days < 0) return <CountdownBadge daysRemaining={days} />;

  const { hours, minutes } = hoursMinutesUntil(deadline, now);
  const urgent = hours < 6;

  return (
    <span
      aria-label={`${hours} hours ${minutes} minutes remaining`}
      className="inline-flex flex-col items-end leading-none"
    >
      <span
        className={[
          'num text-3xl md:text-4xl font-medium tracking-tight',
          urgent ? 'text-signal' : 'text-ink',
        ].join(' ')}
      >
        {hours}
        <span className="text-base text-ink-muted">h</span>
        <span className="ml-1.5">{String(minutes).padStart(2, '0')}</span>
        <span className="text-base text-ink-muted">m</span>
      </span>
      <span className="num mt-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {urgent ? 'Critical' : 'Final day'}
      </span>
    </span>
  );
}
