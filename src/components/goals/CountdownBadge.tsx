import { Badge } from '@/components/ui/badge';

type Props = {
  daysRemaining: number;
};

export function CountdownBadge({ daysRemaining }: Props) {
  if (daysRemaining < 0) {
    return (
      <Badge variant="destructive" aria-label={`Overdue ${-daysRemaining} days`}>
        Overdue {-daysRemaining}d
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" aria-label={`${daysRemaining} days remaining`}>
      {daysRemaining}d
    </Badge>
  );
}
