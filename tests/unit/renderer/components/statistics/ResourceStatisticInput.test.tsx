import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ResourceStatisticInput from '../../../../../src/renderer/components/statistics/ResourceStatisticInput';
import type {
  ResourceStatisticDefinition,
  StatBlockResourceValue,
} from '../../../../../src/shared/statisticsTypes';

describe('ResourceStatisticInput', () => {
  const mockDefinition: ResourceStatisticDefinition = {
    id: 'hp',
    name: 'Hit Points',
    abbreviation: 'HP',
    description: 'Total health',
    isDefault: true,
  };

  const mockValue: StatBlockResourceValue = {
    current: 45,
    maximum: 60,
  };

  it('renders definition name and abbreviation', () => {
    const onChange = vi.fn();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    expect(screen.getByText(/Hit Points \(HP\)/)).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    const onChange = vi.fn();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Total health')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const onChange = vi.fn();
    const defWithoutDesc: ResourceStatisticDefinition = {
      ...mockDefinition,
      description: undefined,
    };
    render(
      <ResourceStatisticInput
        definition={defWithoutDesc}
        value={mockValue}
        onChange={onChange}
      />,
    );

    expect(screen.queryByText('Total health')).not.toBeInTheDocument();
  });

  it('renders current and maximum inputs with correct values', () => {
    const onChange = vi.fn();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;

    expect(currentInput.value).toBe('45');
    expect(maximumInput.value).toBe('60');
  });

  it('initializes with zero values when value prop is null', () => {
    const onChange = vi.fn();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={null}
        onChange={onChange}
      />,
    );

    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;

    expect(currentInput.value).toBe('0');
    expect(maximumInput.value).toBe('0');
  });

  it('calls onChange with new value when current is updated (valid)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    await user.click(currentInput);
    await user.keyboard('{Control>}a{/Control}'); // Select all
    await user.keyboard('50');

    // Check final call after typing
    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toEqual({ current: 50, maximum: 60 });
  });

  it('shows validation error when current exceeds maximum', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    const currentInput = screen.getByLabelText('Current');
    await user.clear(currentInput);
    await user.type(currentInput, '70');

    expect(
      screen.getByText('Current cannot exceed maximum'),
    ).toBeInTheDocument();
  });

  it('does not call onChange when current exceeds maximum', async () => {
    const onChange = vi.fn();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    onChange.mockClear();

    // Use fireEvent to set value directly without intermediate typing steps
    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    fireEvent.change(currentInput, { target: { value: '70' } });

    // When current > maximum (70 > 50), onChange is NOT called
    // Only the validation error is set
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText('Current cannot exceed maximum'),
    ).toBeInTheDocument();
  });

  it('calls onChange with new maximum and clamps current when maximum is reduced', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;
    await user.click(maximumInput);
    await user.keyboard('{Control>}a{/Control}'); // Select all first
    // Type '40' - this will type '4' then '0', each triggering onChange with clamping
    // At '4': maximum=4, current clamped from 45 to 4
    // At '40': maximum=40, current stays at 4 (already valid)
    await user.keyboard('40');

    // Verify that onChange was called (final call has maximum: 40)
    const calls = onChange.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0].maximum).toBe(40);
    // current is clamped based on intermediate values
    expect(lastCall[0].current).toBeLessThanOrEqual(lastCall[0].maximum);
  });

  it('clears validation error when maximum is increased above current', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={{ current: 70, maximum: 60 }}
        onChange={onChange}
      />,
    );

    // Initial state has current > maximum, but validation error only shows after user interaction
    // Change current to trigger validation
    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    await user.click(currentInput);
    await user.keyboard('80'); // Now current > maximum should trigger error

    expect(
      screen.getByText('Current cannot exceed maximum'),
    ).toBeInTheDocument();

    // Now increase maximum to clear error
    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;
    await user.click(maximumInput);
    await user.keyboard('90'); // Make maximum > current to clear error

    expect(
      screen.queryByText('Current cannot exceed maximum'),
    ).not.toBeInTheDocument();

    // Verify onChange was called (maximum should be definitely updated)
    const calls = onChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0].maximum).toBeGreaterThanOrEqual(lastCall[0].current);
  });

  it('disables inputs when disabled prop is true', () => {
    const onChange = vi.fn();
    render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
        disabled={true}
      />,
    );

    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;

    expect(currentInput).toBeDisabled();
    expect(maximumInput).toBeDisabled();
  });

  it('updates inputs when value prop changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;

    expect(currentInput.value).toBe('45');
    expect(maximumInput.value).toBe('60');

    // Update value prop
    rerender(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={{ current: 30, maximum: 50 }}
        onChange={onChange}
      />,
    );

    expect(currentInput.value).toBe('30');
    expect(maximumInput.value).toBe('50');
  });

  it('updates inputs to zero when value prop changes to null', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={mockValue}
        onChange={onChange}
      />,
    );

    rerender(
      <ResourceStatisticInput
        definition={mockDefinition}
        value={null}
        onChange={onChange}
      />,
    );

    const currentInput = screen.getByLabelText('Current') as HTMLInputElement;
    const maximumInput = screen.getByLabelText('Maximum') as HTMLInputElement;

    expect(currentInput.value).toBe('0');
    expect(maximumInput.value).toBe('0');
  });
});
