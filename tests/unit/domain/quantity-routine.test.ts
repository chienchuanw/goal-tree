import { describe, it, expect } from 'vitest';
import { deriveQuantityStatus } from '@/domain/quantity-routine';

describe('deriveQuantityStatus', () => {
  it('returns null for value <= 0 (caller should delete the row)', () => {
    expect(deriveQuantityStatus(0, 30)).toBeNull();
    expect(deriveQuantityStatus(-5, 30)).toBeNull();
    expect(deriveQuantityStatus(0, null)).toBeNull();
  });

  it('returns "done" when value meets or exceeds target', () => {
    expect(deriveQuantityStatus(30, 30)).toBe('done');
    expect(deriveQuantityStatus(45, 30)).toBe('done');
  });

  it('returns "partial" when value is positive but below target', () => {
    expect(deriveQuantityStatus(15, 30)).toBe('partial');
  });

  it('returns "done" for any positive value when target is null', () => {
    expect(deriveQuantityStatus(1, null)).toBe('done');
    expect(deriveQuantityStatus(999, null)).toBe('done');
  });
});
