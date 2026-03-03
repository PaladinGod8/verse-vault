import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignForm from '../../../src/renderer/components/campaigns/CampaignForm';

describe('CampaignForm', () => {
  it('shows validation error when submitted without a campaign name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<CampaignForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));

    expect(screen.getByText('Campaign name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values and maps empty summary to null', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<CampaignForm worldId={9} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '  Arcadia  ');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        world_id: 9,
        name: 'Arcadia',
        summary: null,
      });
    });
  });

  it('shows error messages for thrown Error and non-Error failures', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('save failed'));

    const { rerender } = render(
      <CampaignForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Campaign One');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();

    const onSubmitEdit = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <CampaignForm
        mode="edit"
        worldId={1}
        initialValues={{ name: 'Campaign One', summary: null }}
        onSubmit={onSubmitEdit}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Failed to save campaign changes.'),
    ).toBeInTheDocument();

    const onSubmitCreate = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <CampaignForm worldId={1} onSubmit={onSubmitCreate} onCancel={vi.fn()} />,
    );
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Campaign Two');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));
    expect(
      await screen.findByText('Failed to create campaign.'),
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<CampaignForm worldId={1} onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
