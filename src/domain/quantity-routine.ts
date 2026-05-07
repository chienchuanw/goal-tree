export type QuantityStatus = 'done' | 'partial';

export function deriveQuantityStatus(
  value: number,
  target: number | null,
): QuantityStatus | null {
  if (value <= 0) return null;
  if (target === null) return 'done';
  return value >= target ? 'done' : 'partial';
}
