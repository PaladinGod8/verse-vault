import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopyTokenToCampaignDialog from '../../../src/renderer/components/tokens/CopyTokenToCampaignDialog';

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    world_id: 1,
    campaign_id: null,
    grid_type: 'square',
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

describe('CopyTokenToCampaignDialog', () => {
  it('renders campaign select with first option selected and confirms selected campaign id', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <CopyTokenToCampaignDialog
        token={buildToken({ name: 'Arc Wolf' })}
        campaigns={[
          buildCampaign({ id: 21, name: 'Campaign One' }),
          buildCampaign({ id: 22, name: 'Campaign Two' }),
        ]}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: 'Copy "Arc Wolf" to Campaign' }),
    ).toBeInTheDocument();

    const select = screen.getByLabelText('Campaign');
    expect(select).toHaveValue('21');
    expect(screen.getByRole('option', { name: 'Campaign One' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Campaign Two' })).toBeVisible();

    await user.selectOptions(select, '22');
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(22);
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CopyTokenToCampaignDialog
        token={buildToken()}
        campaigns={[buildCampaign()]}
        onConfirm={vi.fn()}
        onClose={onClose}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders empty state without confirm button when no campaigns exist', () => {
    render(
      <CopyTokenToCampaignDialog
        token={buildToken()}
        campaigns={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByText('No campaigns in this world.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Copy' }),
    ).not.toBeInTheDocument();
  });

  it('disables confirm button while saving', () => {
    render(
      <CopyTokenToCampaignDialog
        token={buildToken()}
        campaigns={[buildCampaign()]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        isSaving
      />,
    );

    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });
});
