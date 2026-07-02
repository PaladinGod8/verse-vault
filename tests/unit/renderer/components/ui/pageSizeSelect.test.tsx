import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PageSizeSelect from '../../../../../src/renderer/components/ui/PageSizeSelect';

describe('PageSizeSelect', () => {
  it('shows the current page size as selected among 10/50/100', () => {
    render(<PageSizeSelect value={50} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Results per page')).toHaveValue('50');
    expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
  });

  it('calls onChange with the numeric page size when the user picks a different option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PageSizeSelect value={10} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Results per page'), '100');

    expect(onChange).toHaveBeenCalledWith(100);
  });
});
