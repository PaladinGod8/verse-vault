import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import RuntimeTokenPalette from '../../../src/renderer/components/runtime/RuntimeTokenPalette';
import type { RuntimeSceneToken } from '../../../src/renderer/components/runtime/BattleMapRuntimeCanvas';

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

function buildPlacedToken(
  overrides: Partial<RuntimeSceneToken> = {},
): RuntimeSceneToken {
  return {
    instanceId: 'runtime-token-1',
    sourceTokenId: 1,
    campaignId: 10,
    name: 'Placed Token',
    imageSrc: null,
    isVisible: true,
    sourceMissing: false,
    x: 8,
    y: 12,
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
      campaigns={[]}
      selectedCampaignId={null}
      isLoadingCampaigns={false}
      campaignLoadError={null}
      worldTokens={[]}
      isLoadingWorldTokens={false}
      worldTokenLoadError={null}
      tokens={[]}
      isLoadingTokens={false}
      tokenLoadError={null}
      placedTokens={[]}
      selectedTokenInstanceId={null}
      showInvisibleTokens
      activeGridMode="square"
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
  it('renders world tokens section and world token rows', () => {
    renderPalette({
      worldTokens: [
        buildToken({ id: 1, campaign_id: null, name: 'World Wolf' }),
        buildToken({ id: 2, campaign_id: null, name: 'World Guard' }),
      ],
    });

    expect(screen.getByText('World Tokens')).toBeInTheDocument();
    expect(screen.getByText('World Wolf')).toBeInTheDocument();
    expect(screen.getByText('World Guard')).toBeInTheDocument();
  });

  it('filters invisible world tokens when showInvisibleTokens is false', () => {
    renderPalette({
      showInvisibleTokens: false,
      worldTokens: [
        buildToken({ id: 1, name: 'Visible Token', is_visible: 1 }),
        buildToken({ id: 2, name: 'Invisible Token', is_visible: 0 }),
      ],
    });

    expect(screen.getByText('Visible Token')).toBeInTheDocument();
    expect(screen.queryByText('Invisible Token')).not.toBeInTheDocument();
  });

  it('notifies when show invisible tokens toggle changes', () => {
    const { onShowInvisibleTokensChange } = renderPalette({
      showInvisibleTokens: false,
    });

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Show invisible tokens' }),
    );
    expect(onShowInvisibleTokensChange).toHaveBeenCalledWith(true);
  });

  it('shows world token empty, loading, and error states', () => {
    const { rerender } = render(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={false}
        campaignLoadError={null}
        worldTokens={[]}
        isLoadingWorldTokens={true}
        worldTokenLoadError={null}
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens
        activeGridMode="square"
        onShowInvisibleTokensChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onAddToken={vi.fn()}
        onSelectPlacedToken={vi.fn()}
        onRemovePlacedToken={vi.fn()}
      />,
    );

    expect(screen.getByText('Loading world tokens...')).toBeInTheDocument();

    rerender(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={false}
        campaignLoadError={null}
        worldTokens={[]}
        isLoadingWorldTokens={false}
        worldTokenLoadError="World token load failed"
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens
        activeGridMode="square"
        onShowInvisibleTokensChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onAddToken={vi.fn()}
        onSelectPlacedToken={vi.fn()}
        onRemovePlacedToken={vi.fn()}
      />,
    );

    expect(screen.getByText('World token load failed')).toBeInTheDocument();

    rerender(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={false}
        campaignLoadError={null}
        worldTokens={[]}
        isLoadingWorldTokens={false}
        worldTokenLoadError={null}
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens
        activeGridMode="square"
        onShowInvisibleTokensChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onAddToken={vi.fn()}
        onSelectPlacedToken={vi.fn()}
        onRemovePlacedToken={vi.fn()}
      />,
    );

    expect(screen.getByText('No world tokens available.')).toBeInTheDocument();
  });

  it('changes selected campaign and handles empty campaign selection', () => {
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

  it('renders campaign loading, error, and empty states', () => {
    const { rerender } = render(
      <RuntimeTokenPalette
        campaigns={[]}
        selectedCampaignId={null}
        isLoadingCampaigns={true}
        campaignLoadError={null}
        worldTokens={[]}
        isLoadingWorldTokens={false}
        worldTokenLoadError={null}
        tokens={[]}
        isLoadingTokens={true}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens
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
        worldTokens={[]}
        isLoadingWorldTokens={false}
        worldTokenLoadError={null}
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError="Token load failed"
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens
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
        worldTokens={[]}
        isLoadingWorldTokens={false}
        worldTokenLoadError={null}
        tokens={[]}
        isLoadingTokens={false}
        tokenLoadError={null}
        placedTokens={[]}
        selectedTokenInstanceId={null}
        showInvisibleTokens
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
  });

  it('sorts campaign tokens by name and adds an unplaced campaign token', () => {
    const { onAddToken } = renderPalette({
      selectedCampaignId: 10,
      tokens: [
        buildToken({
          id: 2,
          campaign_id: 10,
          name: 'Zulu',
        }),
        buildToken({
          id: 1,
          campaign_id: 10,
          name: 'Alpha',
        }),
      ],
    });

    const labels = screen
      .getAllByText(/Alpha|Zulu/)
      .map((element) => element.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Alpha', 'Zulu']));

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    fireEvent.click(addButtons[0]);
    expect(onAddToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Alpha' }),
    );
  });

  it('disables add button when token source is already placed', () => {
    renderPalette({
      selectedCampaignId: 10,
      tokens: [buildToken({ id: 6, campaign_id: 10, name: 'Goblin' })],
      placedTokens: [
        buildPlacedToken({
          sourceTokenId: 6,
          campaignId: 10,
          name: 'Goblin',
        }),
      ],
    });

    expect(screen.getByRole('button', { name: 'Placed' })).toBeDisabled();
  });

  it('adds world token when Add button is clicked', () => {
    const worldToken = buildToken({
      id: 9,
      campaign_id: null,
      name: 'World Knight',
    });
    const { onAddToken } = renderPalette({
      worldTokens: [worldToken],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddToken).toHaveBeenCalledTimes(1);
    expect(onAddToken).toHaveBeenCalledWith(worldToken);
  });

  it('renders scene tokens list and supports select/remove callbacks', () => {
    const { onSelectPlacedToken, onRemovePlacedToken } = renderPalette({
      placedTokens: [
        buildPlacedToken({
          instanceId: 'runtime-token-a',
          name: 'Beta',
          sourceMissing: false,
        }),
        buildPlacedToken({
          instanceId: 'runtime-token-b',
          sourceTokenId: 999,
          name: 'Alpha Missing',
          sourceMissing: true,
          isVisible: false,
        }),
      ],
      selectedTokenInstanceId: 'runtime-token-a',
    });

    expect(screen.getByText('Scene Tokens (2)')).toBeInTheDocument();
    expect(screen.getByText('Source missing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Beta Visible' }));
    expect(onSelectPlacedToken).toHaveBeenCalledWith('runtime-token-a');

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(onRemovePlacedToken).toHaveBeenCalledWith('runtime-token-b');
  });

  it('shows and hides hover image preview for world tokens', () => {
    const imageToken = buildToken({
      id: 12,
      campaign_id: null,
      name: 'Image Token',
      image_src: 'https://assets.example/token.png',
    });
    renderPalette({
      worldTokens: [imageToken],
    });

    const listItem = screen.getByText('Image Token').closest('li');
    expect(listItem).not.toBeNull();

    fireEvent.mouseEnter(listItem as HTMLLIElement);
    expect(
      document.querySelector('img[src="https://assets.example/token.png"]'),
    ).toBeInTheDocument();

    fireEvent.mouseLeave(listItem as HTMLLIElement);
    expect(
      document.querySelector('img[src="https://assets.example/token.png"]'),
    ).not.toBeInTheDocument();
  });

  it('does not show hover preview for tokens without an image source', () => {
    renderPalette({
      worldTokens: [buildToken({ id: 30, name: 'No Image', image_src: null })],
    });

    const listItem = screen.getByText('No Image').closest('li');
    expect(listItem).not.toBeNull();

    fireEvent.mouseEnter(listItem as HTMLLIElement);
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });
});
