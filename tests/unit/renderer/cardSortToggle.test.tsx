import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CardSortToggle from '../../../src/renderer/components/ui/CardSortToggle';

describe('CardSortToggle', () => {
  it('highlights the active sort method and calls onChange when switching', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<CardSortToggle value='alphabetical' onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'A–Z' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Recently Viewed' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Recently Viewed' }));

    expect(onChange).toHaveBeenCalledWith('recentlyViewed');
  });
});
