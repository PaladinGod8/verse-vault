import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TagInput from '../../../src/renderer/components/loreNotes/TagInput';

describe('TagInput', () => {
  it('renders existing tags as chips', () => {
    render(<TagInput tags={['Economics', 'Trade']} onChange={vi.fn()} suggestions={[]} />);

    expect(screen.getByText('Economics')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
  });

  it('adds a tag on Enter and clears the input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />);

    const input = screen.getByLabelText('Tags');
    await user.type(input, 'Economics{Enter}');

    expect(onChange).toHaveBeenCalledWith(['Economics']);
    expect(input).toHaveValue('');
  });

  it('adds a tag on comma', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />);

    await user.type(screen.getByLabelText('Tags'), 'Economics,');

    expect(onChange).toHaveBeenCalledWith(['Economics']);
  });

  it('does not add a duplicate tag case-insensitively', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput tags={['Economics']} onChange={onChange} suggestions={[]} />);

    await user.type(screen.getByLabelText('Tags'), 'economics{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add a blank tag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />);

    await user.type(screen.getByLabelText('Tags'), '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when its remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput tags={['Economics', 'Trade']} onChange={onChange} suggestions={[]} />);

    await user.click(screen.getByRole('button', { name: 'Remove Economics' }));

    expect(onChange).toHaveBeenCalledWith(['Trade']);
  });

  it('removes the last tag on Backspace when input is empty', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput tags={['Economics', 'Trade']} onChange={onChange} suggestions={[]} />);

    const input = screen.getByLabelText('Tags');
    input.focus();
    await user.keyboard('{Backspace}');

    expect(onChange).toHaveBeenCalledWith(['Economics']);
  });

  it('shows filtered suggestions excluding already-added tags', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        tags={['Economics']}
        onChange={vi.fn()}
        suggestions={['Economics', 'Trade', 'Magic']}
      />,
    );

    await user.type(screen.getByLabelText('Tags'), 'ra');

    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.queryByText('Magic')).not.toBeInTheDocument();
  });

  it('adds a tag when a suggestion is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput tags={[]} onChange={onChange} suggestions={['Economics', 'Trade']} />,
    );

    await user.type(screen.getByLabelText('Tags'), 'tra');
    await user.click(screen.getByText('Trade'));

    expect(onChange).toHaveBeenCalledWith(['Trade']);
  });

  it('disables input and remove buttons when disabled', () => {
    render(
      <TagInput tags={['Economics']} onChange={vi.fn()} suggestions={[]} disabled />,
    );

    expect(screen.getByLabelText('Tags')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Economics' })).toBeDisabled();
  });
});
