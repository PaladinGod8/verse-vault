import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import RuntimeTokenPalette from '../../../src/renderer/components/runtime/RuntimeTokenPalette';
import type { RuntimeSceneToken } from '../../../src/renderer/components/runtime/BattleMapRuntimeCanvas';

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    campaign_id: 10,
    name: 'Goblin',
    image_src: null,
    config: '{}',
    is_visible: 1,
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function buildPlacedToken(
  overrides: Partial<RuntimeSceneToken> = {},
): RuntimeSceneToken {
  return {
    instanceId: 'runtime-token-1-1',
    sourceTokenId: 1,
    campaignId: 10,
    name: 'Goblin',
    imageSrc: null,
    isVisible: true,
    sourceMissing: false,
    x: 10,
    y: 20,
    ...overrides,
  };
}

function renderPalette(
  props: Partial<ComponentProps<typeof RuntimeTokenPalette>> = {},
) {
  const onShowInvisibleTokensChange = vi.fn();
  const onSelectCampaign = vi.fn();
  const onAddToken = vi.fn();
  const onSelectPlacedToken = vi.fn();
  const onRemovePlacedToken = vi.fn();

  render(
    <RuntimeTokenPalette
      campaigns={[{ id: 10, world_id: 1, name: 'Main Campaign' } as Campaign]}
      selectedCampaignId={10}
      isLoadingCampaigns={false}
      campaignLoadError={null}
      tokens={[buildToken()]}
      isLoadingTokens={false}
      tokenLoadError={null}
      placedTokens={[]}
      selectedTokenInstanceId={null}
      showInvisibleTokens={true}
      onShowInvisibleTokensChange={onShowInvisibleTokensChange}
      onSelectCampaign={onSelectCampaign}
      onAddToken={onAddToken}
      onSelectPlacedToken={onSelectPlacedToken}
      onRemovePlacedToken={onRemovePlacedToken}
      {...props}
    />,
  );

  return {
    onShowInvisibleTokensChange,
    onSelectCampaign,
    onAddToken,
    onSelectPlacedToken,
    onRemovePlacedToken,
  };
}

describe('RuntimeTokenPalette', () => {
  it('filters invisible tokens when toggle is off and notifies on checkbox changes', () => {
    const invisibleToken = buildToken({
      id: 2,
      name: 'Hidden Scout',
      is_visible: 0,
    });
    const { onShowInvisibleTokensChange } = renderPalette({
      showInvisibleTokens: false,
      tokens: [buildToken({ name: 'Visible Guard' }), invisibleToken],
    });

    expect(screen.getByText('Visible Guard')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Scout')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Show invisible tokens' }),
    );
    expect(onShowInvisibleTokensChange).toHaveBeenCalledWith(true);
  });

  it('sorts available tokens by name and adds unplaced tokens', () => {
    const { onAddToken } = renderPalette({
      tokens: [
        buildToken({ id: 2, name: 'Zulu' }),
        buildToken({ id: 1, name: 'Alpha' }),
      ],
    });

    const labels = screen
      .getAllByText(/Alpha|Zulu/)
      .map((node) => node.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Alpha', 'Zulu']));

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    fireEvent.click(addButtons[0]);
    expect(onAddToken).toHaveBeenCalledTimes(1);
    expect(onAddToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Alpha' }),
    );
  });

  it('disables add for already placed source tokens', () => {
    renderPalette({
      tokens: [buildToken({ id: 1, campaign_id: 10, name: 'Goblin' })],
      placedTokens: [buildPlacedToken({ sourceTokenId: 1, campaignId: 10 })],
    });

    const placedButton = screen.getByRole('button', { name: 'Placed' });
    expect(placedButton).toBeDisabled();
  });

  it('changes selected campaign and handles empty selection', () => {
    const { onSelectCampaign } = renderPalette({
      campaigns: [
        { id: 10, world_id: 1, name: 'Main Campaign' } as Campaign,
        { id: 11, world_id: 1, name: 'Side Campaign' } as Campaign,
      ],
      selectedCampaignId: 10,
    });

    fireEvent.change(screen.getByLabelText('Campaign'), {
      target: { value: '11' },
    });
    expect(onSelectCampaign).toHaveBeenCalledWith(11);

    fireEvent.change(screen.getByLabelText('Campaign'), {
      target: { value: '' },
    });
    expect(onSelectCampaign).toHaveBeenCalledWith(null);
  });

  it('renders loading, error, and empty states', () => {
    const { rerender } = render(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={true}
        campaignLoadError={null}
        tokens={[]}
        isLoadingTokens={true}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens={true}
        onShowInvisibleTokensChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onAddToken={vi.fn()}
        onSelectPlacedToken={vi.fn()}
        onRemovePlacedToken={vi.fn()}
      />,
    );

    expect(screen.getByText('Loading campaign tokens...')).toBeInTheDocument();

    rerender(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={false}
        campaignLoadError="Campaign load failed"
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError="Token load failed"
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens={true}
        onShowInvisibleTokensChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onAddToken={vi.fn()}
        onSelectPlacedToken={vi.fn()}
        onRemovePlacedToken={vi.fn()}
      />,
    );

    expect(screen.getByText('Campaign load failed')).toBeInTheDocument();
    expect(screen.getByText('Token load failed')).toBeInTheDocument();

    rerender(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={false}
        campaignLoadError={null}
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens={true}
        onShowInvisibleTokensChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onAddToken={vi.fn()}
        onSelectPlacedToken={vi.fn()}
        onRemovePlacedToken={vi.fn()}
      />,
    );

    expect(
      screen.getByText('No tokens available for this campaign.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Add tokens from a campaign to place them in runtime.'),
    ).toBeInTheDocument();
  });

  it('sorts placed tokens, selects token, and removes token', () => {
    const { onSelectPlacedToken, onRemovePlacedToken } = renderPalette({
      placedTokens: [
        buildPlacedToken({
          instanceId: 'runtime-token-a',
          name: 'Beta',
          sourceMissing: false,
        }),
        buildPlacedToken({
          instanceId: 'runtime-token-b',
          name: 'Alpha Missing',
          sourceMissing: true,
          sourceTokenId: 999,
        }),
      ],
      selectedTokenInstanceId: 'runtime-token-a',
    });

    expect(screen.getByText('Scene Tokens (2)')).toBeInTheDocument();
    expect(screen.getByText('Source missing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Beta Visible' }));
    expect(onSelectPlacedToken).toHaveBeenCalledWith('runtime-token-a');

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(onRemovePlacedToken).toHaveBeenCalledTimes(1);
  });
});
