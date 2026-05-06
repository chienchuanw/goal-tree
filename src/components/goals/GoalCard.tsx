import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { daysUntil } from '@/domain/countdown';
import type { Goal } from '@/db/schema';
import { CountdownBadge } from './CountdownBadge';
import { HoursCountdown } from './HoursCountdown';
import { ArchiveGoalButton } from './ArchiveGoalButton';

type Props = {
  goal: Goal;
  now: Date;
};

export function GoalCard({ goal, now }: Props) {
  const days = daysUntil(goal.deadlineAt, now);
  const useLiveTicker = days <= 1 && days >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{goal.title}</CardTitle>
          {goal.description ? (
            <CardDescription>{goal.description}</CardDescription>
          ) : null}
        </div>
        {useLiveTicker ? (
          <HoursCountdown deadlineAt={goal.deadlineAt.toISOString()} />
        ) : (
          <CountdownBadge daysRemaining={days} />
        )}
      </CardHeader>
      <CardContent className="flex justify-end">
        <ArchiveGoalButton id={goal.id} />
      </CardContent>
    </Card>
  );
}
