'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
  return (
    <Badge variant="secondary" aria-label={`${hours} hours ${minutes} minutes remaining`}>
      {hours}h {minutes}m
    </Badge>
  );
}
