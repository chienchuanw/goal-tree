import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantityLogInput } from '@/components/routines/QuantityLogInput';

describe('QuantityLogInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders today total with unit and target', () => {
    render(
      <QuantityLogInput
        routineId="r1"
        unit="min"
        target={30}
        todayValue={15}
        incrementAction={vi.fn()}
      />,
    );
    expect(screen.getByText(/15\s*\/\s*30\s*min/i)).toBeInTheDocument();
  });

  it('renders today total without target', () => {
    render(
      <QuantityLogInput
        routineId="r1"
        unit="min"
        todayValue={15}
        incrementAction={vi.fn()}
      />,
    );
    expect(screen.getByText(/15\s*min/i)).toBeInTheDocument();
  });

  it('calls incrementAction with parsed positive integer on Add', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ status: 'ok' });
    render(
      <QuantityLogInput routineId="r1" unit="min" todayValue={0} incrementAction={action} />,
    );
    await user.type(screen.getByLabelText(/add minutes/i), '20');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(action).toHaveBeenCalledWith('r1', 20);
  });

  it('does not call incrementAction with empty input', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <QuantityLogInput routineId="r1" unit="min" todayValue={0} incrementAction={action} />,
    );
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(action).not.toHaveBeenCalled();
  });

  it('does not call incrementAction with non-positive input', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <QuantityLogInput routineId="r1" unit="min" todayValue={0} incrementAction={action} />,
    );
    await user.type(screen.getByLabelText(/add minutes/i), '0');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(action).not.toHaveBeenCalled();
  });
});
