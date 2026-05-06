import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Heatmap30 } from '@/components/routines/Heatmap30';

describe('Heatmap30', () => {
  afterEach(() => cleanup());

  describe('Given a cell with status "done"', () => {
    describe('When rendered', () => {
      it('Then the cell uses the emerald color class', () => {
        render(<Heatmap30 cells={[{ date: '2026-05-01', status: 'done' }]} />);
        const cell = screen.getByTitle('2026-05-01 — done');
        expect(cell.className).toContain('bg-emerald-500');
      });
    });
  });

  describe('Given a mix of statuses', () => {
    describe('When rendered', () => {
      it('Then only "done" cells use emerald', () => {
        render(
          <Heatmap30
            cells={[
              { date: '2026-05-01', status: 'done' },
              { date: '2026-05-02', status: 'partial' },
              { date: '2026-05-03', status: 'skipped' },
              { date: '2026-05-04', status: 'none' },
            ]}
          />,
        );
        expect(screen.getByTitle('2026-05-01 — done').className).toContain(
          'bg-emerald-500',
        );
        expect(
          screen.getByTitle('2026-05-02 — partial').className,
        ).not.toContain('bg-emerald-500');
        expect(
          screen.getByTitle('2026-05-03 — skipped').className,
        ).not.toContain('bg-emerald-500');
        expect(screen.getByTitle('2026-05-04 — none').className).not.toContain(
          'bg-emerald-500',
        );
      });
    });
  });
});
