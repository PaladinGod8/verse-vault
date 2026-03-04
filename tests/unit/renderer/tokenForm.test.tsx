import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TokenForm from '../../../src/renderer/components/tokens/TokenForm';

describe('TokenForm', () => {
  it('renders create mode fields and submit label when initial values are not provided', () => {
    render(<TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving={false} />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Visible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('renders edit mode values and submit label when initial values are provided', () => {
    render(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          image_src: 'https://assets.example/token.png',
          is_visible: 1,
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByLabelText('Name *')).toHaveValue('Existing Token');
    expect(screen.getByLabelText('Image URL')).toHaveValue(
      'https://assets.example/token.png',
    );
    expect(screen.getByLabelText('Visible')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('blocks submit when name is empty or whitespace-only', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Name *'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits trimmed values and maps empty image_src to null', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.type(screen.getByLabelText('Name *'), '  Arc Wolf  ');
    await user.click(screen.getByLabelText('Visible'));
    await user.type(screen.getByLabelText('Image URL'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: 'Arc Wolf',
      image_src: null,
      is_visible: 0,
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<TokenForm onSave={vi.fn()} onClose={onClose} isSaving={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables submit while saving', () => {
    render(<TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });
});
