import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveTokenDialog from '../../../src/renderer/components/tokens/MoveTokenDialog';

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    world_id: 1,
    campaign_id: null,
    name: 'Wolf',
    image_src: null,
    config: '{}',
    is_visible: 1,
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 10,
    world_id: 1,
    name: 'Main Campaign',
    summary: null,
    config: '{}',
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

describe('MoveTokenDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toWorld mode', () => {
    it('displays correct title for moving to world', () => {
      render(
        <MoveTokenDialog
          token={buildToken({ name: 'Dragon' })}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText('Move Token to World')).toBeInTheDocument();
    });

    it('displays correct description for moving to world', () => {
      render(
        <MoveTokenDialog
          token={buildToken({ name: 'Dragon' })}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(
        screen.getByText(
          /Move "Dragon" to World\? It will no longer be campaign-scoped\./,
        ),
      ).toBeInTheDocument();
    });

    it('does not show campaign select when mode is toWorld', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[buildCampaign()]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(
        screen.queryByLabelText('Target Campaign'),
      ).not.toBeInTheDocument();
    });

    it('calls onConfirm with token and no campaignId when confirming toWorld', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const token = buildToken({ id: 42 });

      render(
        <MoveTokenDialog
          token={token}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(token, undefined);
    });

    it('enables Move button when mode is toWorld', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const moveButton = screen.getByRole('button', { name: 'Move' });
      expect(moveButton).not.toBeDisabled();
    });
  });

  describe('toCampaign mode', () => {
    it('displays correct title for moving to campaign', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign()]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText('Move Token to Campaign')).toBeInTheDocument();
    });

    it('shows campaign select when mode is toCampaign', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign()]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Target Campaign')).toBeInTheDocument();
    });

    it('selects first campaign by default when opening in toCampaign mode', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[
            buildCampaign({ id: 1, name: 'Campaign A' }),
            buildCampaign({ id: 2, name: 'Campaign B' }),
          ]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const select = screen.getByLabelText(
        'Target Campaign',
      ) as HTMLSelectElement;
      expect(select.value).toBe('1');
    });

    it('displays campaign options in select', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[
            buildCampaign({ id: 1, name: 'Campaign Alpha' }),
            buildCampaign({ id: 2, name: 'Campaign Beta' }),
          ]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(
        screen.getByRole('option', { name: 'Campaign Alpha' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Campaign Beta' }),
      ).toBeInTheDocument();
    });

    it('displays description with selected campaign name', () => {
      render(
        <MoveTokenDialog
          token={buildToken({ name: 'Ogre' })}
          mode="toCampaign"
          campaigns={[buildCampaign({ id: 1, name: 'Dragonslayers' })]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/Move "Ogre" to "Dragonslayers"\?/),
      ).toBeInTheDocument();
    });

    it('updates description when campaign selection changes', async () => {
      const user = userEvent.setup();
      render(
        <MoveTokenDialog
          token={buildToken({ name: 'Knight' })}
          mode="toCampaign"
          campaigns={[
            buildCampaign({ id: 1, name: 'Campaign A' }),
            buildCampaign({ id: 2, name: 'Campaign B' }),
          ]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const select = screen.getByLabelText('Target Campaign');
      await user.selectOptions(select, '2');

      expect(
        screen.getByText(/Move "Knight" to "Campaign B"\?/),
      ).toBeInTheDocument();
    });

    it('calls onConfirm with token and selected campaignId when confirming toCampaign', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const token = buildToken({ id: 99 });

      render(
        <MoveTokenDialog
          token={token}
          mode="toCampaign"
          campaigns={[buildCampaign({ id: 5 }), buildCampaign({ id: 6 })]}
          isOpen={true}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      const select = screen.getByLabelText('Target Campaign');
      await user.selectOptions(select, '6');
      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(token, 6);
    });

    it('shows empty campaigns message when no campaigns available', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(
        screen.getByText('No campaigns available in this world.'),
      ).toBeInTheDocument();
    });

    it('disables Move button when no campaigns available', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const moveButton = screen.getByRole('button', { name: 'Move' });
      expect(moveButton).toBeDisabled();
    });

    it('disables select when isPending is true', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign()]}
          isOpen={true}
          isPending={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const select = screen.getByLabelText('Target Campaign');
      expect(select).toBeDisabled();
    });

    it('disables Move button when isPending is true', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign()]}
          isOpen={true}
          isPending={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const moveButton = screen.getByRole('button', { name: 'Moving...' });
      expect(moveButton).toBeDisabled();
    });

    it('shows loading spinner when isPending is true', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign()]}
          isOpen={true}
          isPending={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText('Moving...')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error message when onConfirm throws Error with message', async () => {
      const user = userEvent.setup();
      const onConfirm = vi
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(
        await screen.findByText('Database connection failed'),
      ).toBeInTheDocument();
    });

    it('shows error message when onConfirm throws string error', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockRejectedValue('Custom error string');

      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(
        await screen.findByText('Custom error string'),
      ).toBeInTheDocument();
    });

    it('shows generic error message for unknown error type', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockRejectedValue({ random: 'object' });

      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(
        await screen.findByText('Failed to move token.'),
      ).toBeInTheDocument();
    });

    it('clears error when dialog reopens', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockRejectedValue('Error message');

      const { rerender } = render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Move' }));
      expect(await screen.findByText('Error message')).toBeInTheDocument();

      // Close and reopen
      rerender(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={false}
          isPending={false}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      rerender(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });
  });

  describe('dialog interactions', () => {
    it('calls onCancel when Cancel button clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables Cancel button when isPending is true', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={true}
          isPending={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });

    it('does not render anything when isOpen is false', () => {
      render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[]}
          isOpen={false}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.queryByText('Move Token to World')).not.toBeInTheDocument();
    });
  });

  describe('campaign selection edge cases', () => {
    it('handles campaign select when campaigns prop changes', async () => {
      const { rerender } = render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign({ id: 1, name: 'Initial' })]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const select = screen.getByLabelText(
        'Target Campaign',
      ) as HTMLSelectElement;
      expect(select.value).toBe('1');

      rerender(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[
            buildCampaign({ id: 2, name: 'Updated' }),
            buildCampaign({ id: 3, name: 'New' }),
          ]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const updatedSelect = screen.getByLabelText(
        'Target Campaign',
      ) as HTMLSelectElement;
      expect(updatedSelect.value).toBe('2');
    });

    it('resets selection when switching from toCampaign to toWorld mode', () => {
      const { rerender } = render(
        <MoveTokenDialog
          token={buildToken()}
          mode="toCampaign"
          campaigns={[buildCampaign({ id: 1 })]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      rerender(
        <MoveTokenDialog
          token={buildToken()}
          mode="toWorld"
          campaigns={[buildCampaign({ id: 1 })]}
          isOpen={true}
          isPending={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(
        screen.queryByLabelText('Target Campaign'),
      ).not.toBeInTheDocument();
    });
  });
});
