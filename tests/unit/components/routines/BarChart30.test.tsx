import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BarChart30 } from '@/components/routines/BarChart30';

afterEach(() => {
  cleanup();
});

const cells30 = (values: Array<number | null>) =>
  values.map((value, i) => ({ date: `2026-04-${String(10 + i).padStart(2, '0')}`, value }));

describe('BarChart30', () => {
  it('renders 30 bar cells', () => {
    const { container } = render(<BarChart30 cells={cells30(new Array(30).fill(null))} unit="min" />);
    expect(container.querySelectorAll('[data-testid^="bar-cell-"]').length).toBe(30);
  });

  it('applies emerald-500 to bars meeting target', () => {
    const { container } = render(
      <BarChart30 cells={cells30([30, ...new Array(29).fill(null)])} target={30} unit="min" />,
    );
    const bar = container.querySelector('[data-testid="bar-cell-0"] [data-testid="bar"]');
    expect(bar?.className).toContain('bg-emerald-500');
  });

  it('applies emerald-300 to partial bars', () => {
    const { container } = render(
      <BarChart30 cells={cells30([15, ...new Array(29).fill(null)])} target={30} unit="min" />,
    );
    const bar = container.querySelector('[data-testid="bar-cell-0"] [data-testid="bar"]');
    expect(bar?.className).toContain('bg-emerald-300');
  });

  it('renders the goal line when target is set', () => {
    const { container } = render(
      <BarChart30 cells={cells30(new Array(30).fill(null))} target={30} unit="min" />,
    );
    expect(container.querySelector('[data-testid="goal-line"]')).not.toBeNull();
  });

  it('omits the goal line when target is undefined', () => {
    const { container } = render(<BarChart30 cells={cells30(new Array(30).fill(null))} unit="min" />);
    expect(container.querySelector('[data-testid="goal-line"]')).toBeNull();
  });

  it('treats any positive value as done when target is undefined', () => {
    const { container } = render(
      <BarChart30 cells={cells30([1, ...new Array(29).fill(null)])} unit="min" />,
    );
    const bar = container.querySelector('[data-testid="bar-cell-0"] [data-testid="bar"]');
    expect(bar?.className).toContain('bg-emerald-500');
  });
});
