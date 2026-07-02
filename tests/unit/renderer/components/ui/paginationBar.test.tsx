import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PaginationBar from '../../../../../src/renderer/components/ui/PaginationBar';

describe('PaginationBar', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <PaginationBar page={1} totalPages={1} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current page and total pages, with both buttons enabled in the middle', () => {
    render(<PaginationBar page={2} totalPages={5} onPageChange={vi.fn()} />);

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('disables Previous on the first page', () => {
    render(<PaginationBar page={1} totalPages={5} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    render(<PaginationBar page={5} totalPages={5} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });

  it('calls onPageChange with the adjacent page when Previous/Next are clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<PaginationBar page={3} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(4);

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
