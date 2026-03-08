import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BattleMapRuntimePage from '../../../src/renderer/pages/BattleMapRuntimePage';
import {
  buildAbility,
  buildBattleMap as buildBattleMapFactory,
  buildCampaign as buildCampaignFactory,
  buildToken as buildTokenFactory,
  resetFactoryIds,
} from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

const routerMockState = vi.hoisted(() => ({
  beforeUnloadHandler: null as
    | ((event: { preventDefault: () => void; returnValue?: string; }) => void)
    | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );

  return {
    ...actual,
    useBeforeUnload: (
      callback: (event: {
        preventDefault: () => void;
        returnValue?: string;
      }) => void,
    ) => {
      routerMockState.beforeUnloadHandler = callback;
    },
  };
});

vi.mock(
  '../../../src/renderer/components/runtime/BattleMapRuntimeCanvas',
  () => ({
    default: ({
      tokens,
      selectedTokenInstanceId,
      onTokenSelect,
      onTokenDoubleClick,
      onTokenMove,
      castingState,
      onCastingAngleChange,
    }: {
      tokens: Array<{ instanceId: string; x: number; y: number; }>;
      selectedTokenInstanceId: string | null;
      onTokenSelect: (tokenInstanceId: string | null) => void;
      onTokenDoubleClick: (tokenInstanceId: string) => void;
      onTokenMove: (
        tokenInstanceId: string,
        position: { x: number; y: number; },
      ) => void;
      castingState: {
        casterX: number;
        casterY: number;
        angleRad: number;
        ability: Ability;
      } | null;
      onCastingAngleChange: (angleRad: number) => void;
    }) => (
      <div data-testid='runtime-canvas'>
        Runtime Canvas Mock
        <p>Canvas Tokens: {tokens.length}</p>
        <p>Canvas Selected Token: {selectedTokenInstanceId ?? 'none'}</p>
        <p>
          Casting: {castingState
            ? `${castingState.ability.name}|${castingState.angleRad.toFixed(2)}`
            : 'none'}
        </p>
        <button
          type='button'
          onClick={() => {
            if (tokens[0]) {
              onTokenSelect(tokens[0].instanceId);
            }
          }}
        >
          Select First Runtime Token
        </button>
        <button
          type='button'
          onClick={() => {
            if (tokens[1]) {
              onTokenSelect(tokens[1].instanceId);
            }
          }}
        >
          Select Second Runtime Token
        </button>
        <button
          type='button'
          onClick={() => {
            if (tokens[0]) {
              onTokenMove(tokens[0].instanceId, { x: 111, y: 222 });
            }
          }}
        >
          Move First Runtime Token
        </button>
        <button type='button' onClick={() => onTokenSelect(null)}>
          Deselect Runtime Token
        </button>
        <button
          type='button'
          onClick={() => {
            if (tokens[0]) {
              onTokenDoubleClick(tokens[0].instanceId);
            }
          }}
        >
          Double Click First Runtime Token
        </button>
        <button type='button' onClick={() => onCastingAngleChange(Math.PI / 3)}>
          Rotate Casting Angle
        </button>
      </div>
    ),
  }),
);

vi.mock('../../../src/renderer/components/runtime/RuntimeGridControls', () => ({
  default: ({
    gridConfig,
    onChange,
    saveError,
  }: {
    gridConfig: BattleMapRuntimeGridConfig;
    onChange: (next: BattleMapRuntimeGridConfig) => void;
    saveError: string | null;
  }) => (
    <div>
      <button
        type='button'
        onClick={() =>
          onChange({
            mode: 'triangle' as unknown as BattleMapGridMode,
            cellSize: 9999,
            originX: 24.5,
            originY: -10,
          })}
      >
        Trigger Grid Change
      </button>
      <button type='button' onClick={() => onChange(gridConfig)}>
        Trigger Same Grid Change
      </button>
      <button
        type='button'
        onClick={() =>
          onChange({
            mode: 'hex',
            cellSize: 55,
            originX: 13,
            originY: -17,
          })}
      >
        Trigger Hex Grid Change
      </button>
      {saveError ? <p>{saveError}</p> : null}
    </div>
  ),
}));

vi.mock('../../../src/renderer/components/runtime/RuntimeTokenPalette', () => ({
  default: ({
    campaigns,
    selectedCampaignId,
    campaignLoadError,
    tokenLoadError,
    tokens,
    placedTokens,
    selectedTokenInstanceId,
    showInvisibleTokens,
    activeGridMode,
    onShowInvisibleTokensChange,
    onSelectCampaign,
    onAddToken,
    onSelectPlacedToken,
    onRemovePlacedToken,
  }: {
    campaigns: Campaign[];
    selectedCampaignId: number | null;
    campaignLoadError: string | null;
    tokenLoadError: string | null;
    tokens: Token[];
    placedTokens: Array<{
      instanceId: string;
      x: number;
      y: number;
      sourceMissing: boolean;
    }>;
    selectedTokenInstanceId: string | null;
    showInvisibleTokens: boolean;
    activeGridMode: BattleMapGridMode;
    onShowInvisibleTokensChange: (nextValue: boolean) => void;
    onSelectCampaign: (campaignId: number | null) => void;
    onAddToken: (token: Token) => void;
    onSelectPlacedToken: (tokenInstanceId: string) => void;
    onRemovePlacedToken: (tokenInstanceId: string) => void;
  }) => (
    <div>
      <p>Runtime Token Palette Mock</p>
      <p>Campaigns: {campaigns.length}</p>
      <p>Selected Campaign: {selectedCampaignId ?? 'none'}</p>
      <p>Campaign Tokens: {tokens.length}</p>
      <p>Placed Tokens: {placedTokens.length}</p>
      <p>Selected Runtime Token: {selectedTokenInstanceId ?? 'none'}</p>
      <p>Active Grid Mode: {activeGridMode}</p>
      <p>
        First Runtime Token Position:{' '}
        {placedTokens[0] ? `${placedTokens[0].x}:${placedTokens[0].y}` : 'none'}
      </p>
      <p>
        First Runtime Token Missing:{' '}
        {placedTokens[0] ? String(placedTokens[0].sourceMissing) : 'none'}
      </p>
      {campaignLoadError ? <p>{campaignLoadError}</p> : null}
      {tokenLoadError ? <p>{tokenLoadError}</p> : null}
      <button
        type='button'
        onClick={() => onShowInvisibleTokensChange(!showInvisibleTokens)}
      >
        Toggle Invisible Tokens
      </button>
      <button type='button' onClick={() => onSelectCampaign(null)}>
        Clear Campaign
      </button>
      <button
        type='button'
        onClick={() => {
          if (campaigns[1]) {
            onSelectCampaign(campaigns[1].id);
          }
        }}
      >
        Select Second Campaign
      </button>
      <button
        type='button'
        onClick={() => {
          if (tokens[0]) {
            onAddToken(tokens[0]);
          }
        }}
      >
        Add First Token
      </button>
      <button
        type='button'
        onClick={() => {
          if (tokens[1]) {
            onAddToken(tokens[1]);
          }
        }}
      >
        Add Second Token
      </button>
      <button
        type='button'
        onClick={() => {
          if (tokens[2]) {
            onAddToken(tokens[2]);
          }
        }}
      >
        Add Third Token
      </button>
      <button
        type='button'
        onClick={() => {
          if (placedTokens[0]) {
            onSelectPlacedToken(placedTokens[0].instanceId);
          }
        }}
      >
        Select First Placed Token
      </button>
      <button
        type='button'
        onClick={() => {
          if (placedTokens[0]) {
            onRemovePlacedToken(placedTokens[0].instanceId);
          }
        }}
      >
        Remove First Placed Token
      </button>
    </div>
  ),
}));

vi.mock('../../../src/renderer/components/runtime/AbilityPickerPanel', () => ({
  default: ({
    sourceTokenId,
    tokenName,
    castingAbility,
    onAbilitySelect,
  }: {
    sourceTokenId: number | null;
    tokenName: string;
    castingAbility: Ability | null;
    onAbilitySelect: (ability: Ability | null) => void;
  }) => {
    const castableAbility = buildAbility({
      id: 901,
      world_id: 1,
      name: 'Castable Bolt',
      range_cells: 6,
      aoe_shape: 'line',
      aoe_size_cells: 1,
      target_type: 'tile',
    });

    return (
      <div data-testid='ability-picker-panel'>
        <p>Ability Picker (Source Token: {sourceTokenId ?? 'none'})</p>
        <p>Ability Picker Token Name: {tokenName}</p>
        <button type='button' onClick={() => onAbilitySelect(castableAbility)}>
          Pick Castable Ability
        </button>
        <button type='button' onClick={() => onAbilitySelect(null)}>
          Close Ability Picker
        </button>
        {castingAbility ? <p>Selected: {castingAbility.name}</p> : <p>No ability selected</p>}
      </div>
    );
  },
}));

vi.mock('../../../src/renderer/components/runtime/StatBlockPopup', () => ({
  default: ({
    isOpen,
    tokenName,
    sourceTokenId,
    castingAbility,
    onAbilitySelect,
    onClose,
  }: {
    isOpen: boolean;
    tokenName: string;
    sourceTokenId: number | null;
    castingAbility: Ability | null;
    onAbilitySelect: (ability: Ability | null) => void;
    onClose: () => void;
  }) =>
    isOpen
      ? (
        <div data-testid='statblock-popup'>
          <p>StatBlock Popup Token: {tokenName}</p>
          <p>StatBlock Popup Source: {sourceTokenId ?? 'none'}</p>
          <p>
            StatBlock Popup Casting: {castingAbility ? castingAbility.name : 'none'}
          </p>
          <button
            type='button'
            onClick={() =>
              onAbilitySelect(buildAbility({
                id: 990,
                world_id: 1,
                name: 'Popup Cast',
                range_cells: 7,
                aoe_shape: 'circle',
                aoe_size_cells: 2,
                target_type: 'tile',
              }))}
          >
            Pick Popup Ability
          </button>
          <button type='button' onClick={onClose}>
            Close Popup
          </button>
        </div>
      )
      : null,
}));

const battlemapsGetByIdMock = vi.fn();
const battlemapsUpdateMock = vi.fn();
const campaignsGetAllByWorldMock = vi.fn();
const tokensGetAllByWorldMock = vi.fn();
const tokensGetAllByCampaignMock = vi.fn();

function buildBattleMap(overrides: Partial<BattleMap> = {}): BattleMap {
  return buildBattleMapFactory({
    id: 61,
    world_id: 1,
    name: 'Dungeon Grid',
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  });
}

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return buildCampaignFactory({
    id: 31,
    world_id: 1,
    name: 'Campaign One',
    summary: null,
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  });
}

function buildToken(overrides: Partial<Token> = {}): Token {
  return buildTokenFactory({
    id: 71,
    world_id: 1,
    campaign_id: 31,
    grid_type: 'square',
    name: 'Goblin',
    image_src: null,
    config: '{}',
    is_visible: 1,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  });
}

function renderRuntimePage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path='/world/:id/battlemaps/:battleMapId/runtime'
          element={<BattleMapRuntimePage />}
        />
        <Route
          path='/world/:id/battlemaps'
          element={<div>BattleMaps List</div>}
        />
        <Route path='/' element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BattleMapRuntimePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMockState.beforeUnloadHandler = null;
    vi.restoreAllMocks();
    resetFactoryIds();

    const mockDb = setupWindowDb();
    resetWindowDb();
    mockDb.campaigns.getAllByWorld =
      campaignsGetAllByWorldMock as typeof mockDb.campaigns.getAllByWorld;
    mockDb.battlemaps.getById = battlemapsGetByIdMock as typeof mockDb.battlemaps.getById;
    mockDb.battlemaps.update = battlemapsUpdateMock as typeof mockDb.battlemaps.update;
    mockDb.tokens.getAllByWorld = tokensGetAllByWorldMock as typeof mockDb.tokens.getAllByWorld;
    mockDb.tokens.getAllByCampaign =
      tokensGetAllByCampaignMock as typeof mockDb.tokens.getAllByCampaign;

    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByCampaignMock.mockResolvedValue([]);
  });

  it('shows invalid id error and exits back to battlemaps', async () => {
    renderRuntimePage('/world/abc/battlemaps/61/runtime');

    expect(
      await screen.findByText('Invalid world or BattleMap id.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Exit Runtime' })[0]);
    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('shows recovery message when runtime config json is invalid', async () => {
    battlemapsGetByIdMock.mockResolvedValue(
      buildBattleMap({ config: 'not-json' }),
    );

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(
      await screen.findByText(
        'Invalid runtime config JSON. Update this BattleMap config before entering runtime.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Exit Runtime' }),
    ).toHaveLength(2);
  });

  it('navigates to battlemaps list when exiting runtime from loaded page', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exit Runtime' }));

    expect(await screen.findByText('BattleMaps List')).toBeInTheDocument();
  });

  it('normalizes and persists runtime grid changes', async () => {
    const baseBattleMap = buildBattleMap();
    battlemapsGetByIdMock.mockResolvedValue(baseBattleMap);
    battlemapsUpdateMock.mockImplementation(
      async (_id: number, data: { config?: string; }) => ({
        ...baseBattleMap,
        config: data.config ?? baseBattleMap.config,
        updated_at: '2026-03-04 10:00:00',
      }),
    );

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Grid Change' }),
    );

    await waitFor(
      () => {
        expect(battlemapsUpdateMock).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );

    const updateCall = battlemapsUpdateMock.mock.calls[0] as [
      number,
      { config: string; },
    ];
    expect(updateCall[0]).toBe(61);

    const nextConfig = JSON.parse(updateCall[1].config);
    expect(nextConfig.runtime.grid).toEqual({
      mode: 'square',
      cellSize: 240,
      originX: 24.5,
      originY: -10,
    });
  });

  it('shows unavailable message when battlemaps cannot be loaded', async () => {
    battlemapsGetByIdMock.mockRejectedValue(new Error('db offline'));

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(
      await screen.findByText('Unable to load BattleMap runtime right now.'),
    ).toBeInTheDocument();
  });

  it('shows not found when battlemaps id is missing or belongs to another world', async () => {
    battlemapsGetByIdMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildBattleMap({ world_id: 2 }));

    const { unmount } = renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('BattleMap not found.')).toBeInTheDocument();
    unmount();

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('BattleMap not found.')).toBeInTheDocument();
  });

  it('renders campaign and token loading errors', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockRejectedValue(new Error('campaigns failed'));

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(
      await screen.findByText('Unable to load campaigns for runtime tokens.'),
    ).toBeInTheDocument();
  });

  it('loads campaigns and handles token load errors for selected campaign', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([
      buildCampaign({ id: 31, name: 'Campaign 31' }),
      buildCampaign({ id: 32, name: 'Campaign 32' }),
    ]);
    tokensGetAllByCampaignMock.mockImplementation(
      async (campaignId: number) => {
        if (campaignId === 32) {
          throw new Error('token load failed');
        }
        return [buildToken({ campaign_id: campaignId })];
      },
    );

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(
      await screen.findByText('Selected Campaign: 31'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(tokensGetAllByCampaignMock).toHaveBeenCalledWith(31);
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Select Second Campaign' }),
    );
    await waitFor(() => {
      expect(tokensGetAllByCampaignMock).toHaveBeenCalledWith(32);
    });
    expect(
      await screen.findByText('Unable to load tokens for this campaign.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Campaign' }));
    expect(
      await screen.findByText('Selected Campaign: 31'),
    ).toBeInTheDocument();
  });

  it('adds, selects, moves, and removes runtime tokens through callbacks', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign({ id: 31 })]);
    tokensGetAllByCampaignMock.mockResolvedValue([buildToken({ id: 71 })]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(await screen.findByText('Placed Tokens: 1')).toBeInTheDocument();
    expect(
      screen.getByText('Selected Runtime Token: none'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(screen.getByText('Placed Tokens: 1')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Move First Runtime Token' }),
    );
    expect(
      await screen.findByText('First Runtime Token Position: 111:222'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Select First Placed Token' }),
    );
    expect(
      await screen.findByText(/Selected Runtime Token: runtime-token-71-/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove First Placed Token' }),
    );
    expect(await screen.findByText('Placed Tokens: 0')).toBeInTheDocument();
    expect(
      await screen.findByText('Selected Runtime Token: none'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle Invisible Tokens' }),
    );
  });

  it('shows runtime save error when battlemaps update fails', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    battlemapsUpdateMock.mockRejectedValueOnce(new Error('save failed'));

    renderRuntimePage('/world/1/battlemaps/61/runtime');

    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Grid Change' }),
    );

    expect(await screen.findByText('save failed')).toBeInTheDocument();
  });

  it('applies before-unload guard only when runtime changes are pending', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(routerMockState.beforeUnloadHandler).not.toBeNull();

    const idleEvent = {
      preventDefault: vi.fn(),
      returnValue: undefined as string | undefined,
    };
    routerMockState.beforeUnloadHandler?.(idleEvent);
    expect(idleEvent.preventDefault).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Grid Change' }),
    );
    const pendingEvent = {
      preventDefault: vi.fn(),
      returnValue: undefined as string | undefined,
    };
    routerMockState.beforeUnloadHandler?.(pendingEvent);
    expect(pendingEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(pendingEvent.returnValue).toBe('');
  });

  it('does not persist runtime config when the grid update is unchanged', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Same Grid Change' }),
    );

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(battlemapsUpdateMock).not.toHaveBeenCalled();
  });

  it('shows fallback runtime save error when update rejects with a non-Error value', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    battlemapsUpdateMock.mockRejectedValueOnce('nope');

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Grid Change' }),
    );

    expect(
      await screen.findByText('Unable to persist runtime settings right now.'),
    ).toBeInTheDocument();
  });

  it('exits runtime via the Back to BattleMaps link', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Back to BattleMaps' }));

    expect(await screen.findByText('BattleMaps List')).toBeInTheDocument();
  });

  it('stays on runtime page when user cancels exit with unsaved changes', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    battlemapsUpdateMock.mockRejectedValue(new Error('save failed'));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Grid Change' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Exit Runtime' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
    });
    expect(screen.getByText('Runtime Canvas')).toBeInTheDocument();
  });

  it('exits runtime from the error section exit button', async () => {
    battlemapsGetByIdMock.mockRejectedValue(new Error('db offline'));

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime unavailable')).toBeInTheDocument();

    const exitButtons = screen.getAllByRole('button', { name: 'Exit Runtime' });
    fireEvent.click(exitButtons[exitButtons.length - 1]);

    expect(await screen.findByText('BattleMaps List')).toBeInTheDocument();
  });

  it('marks placed token source as missing when campaign reload no longer includes it', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign({ id: 31 })]);
    let tokenLoadCount = 0;
    tokensGetAllByCampaignMock.mockImplementation(() => {
      tokenLoadCount += 1;
      if (tokenLoadCount === 1) {
        return Promise.resolve([buildToken({ id: 71 })]);
      }
      return Promise.resolve([]);
    });

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(await screen.findByText('Placed Tokens: 1')).toBeInTheDocument();
    expect(
      screen.getByText('First Runtime Token Missing: false'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Campaign' }));

    await waitFor(() => {
      expect(tokensGetAllByCampaignMock).toHaveBeenCalledTimes(2);
      expect(
        screen.getByText('First Runtime Token Missing: true'),
      ).toBeInTheDocument();
    });
  });

  it('places multiple tokens on a hex grid after runtime grid update', async () => {
    const baseBattleMap = buildBattleMap();
    battlemapsGetByIdMock.mockResolvedValue(baseBattleMap);
    battlemapsUpdateMock.mockImplementation(
      async (_id: number, data: { config?: string; }) => ({
        ...baseBattleMap,
        config: data.config ?? baseBattleMap.config,
        updated_at: '2026-03-04 10:00:00',
      }),
    );
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign({ id: 31 })]);
    tokensGetAllByCampaignMock.mockResolvedValue([
      buildToken({ id: 71, name: 'Goblin A', grid_type: 'hex' }),
      buildToken({ id: 72, name: 'Goblin B', grid_type: 'hex' }),
      buildToken({ id: 73, name: 'Goblin C', grid_type: 'hex' }),
    ]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Hex Grid Change' }),
    );
    await waitFor(() => {
      expect(battlemapsUpdateMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Second Token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Third Token' }));

    expect(await screen.findByText('Placed Tokens: 3')).toBeInTheDocument();
  });

  it('shows and hides AbilityPickerPanel as runtime token selection changes', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([buildToken()]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('ability-picker-panel'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Select First Placed Token' }),
    );
    expect(
      await screen.findByTestId('ability-picker-panel'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Deselect Runtime Token' }),
    );
    await waitFor(() => {
      expect(
        screen.queryByTestId('ability-picker-panel'),
      ).not.toBeInTheDocument();
    });
  });

  it('passes selected runtime token source metadata into AbilityPickerPanel', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([
      buildToken({ id: 71, name: 'Linked Goblin' }),
    ]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(await screen.findByText('Placed Tokens: 1')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Select First Placed Token' }),
    );

    expect(
      await screen.findByText('Ability Picker (Source Token: 71)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ability Picker Token Name: Linked Goblin'),
    ).toBeInTheDocument();
  });

  it('passes casting state to canvas and clears it when picker closes', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([buildToken()]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Select First Placed Token' }),
    );
    expect(
      await screen.findByTestId('ability-picker-panel'),
    ).toBeInTheDocument();
    expect(screen.getByText('Casting: none')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Pick Castable Ability' }),
    );
    expect(
      await screen.findByText('Casting: Castable Bolt|0.00'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Rotate Casting Angle' }),
    );
    expect(
      await screen.findByText('Casting: Castable Bolt|1.05'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Close Ability Picker' }),
    );
    expect(await screen.findByText('Casting: none')).toBeInTheDocument();
  });

  it('resets casting ability when selecting a different runtime token', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([
      buildToken({ id: 71, name: 'Token A' }),
      buildToken({ id: 72, name: 'Token B' }),
    ]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Second Token' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Second Runtime Token' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Pick Castable Ability' }),
    );
    expect(
      await screen.findByText('Casting: Castable Bolt|0.00'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Select First Placed Token' }),
    );
    expect(await screen.findByText('Casting: none')).toBeInTheDocument();
  });

  it('opens and closes statblock popup from runtime token double click', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([
      buildToken({ id: 71, name: 'Popup Goblin' }),
    ]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(await screen.findByText('Placed Tokens: 1')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Double Click First Runtime Token' }),
    );

    expect(await screen.findByTestId('statblock-popup')).toBeInTheDocument();
    expect(
      screen.getByText('StatBlock Popup Token: Popup Goblin'),
    ).toBeInTheDocument();
    expect(screen.getByText('StatBlock Popup Source: 71')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Popup' }));
    await waitFor(() => {
      expect(screen.queryByTestId('statblock-popup')).not.toBeInTheDocument();
    });
  });

  it('keeps casting flow stable when popup selects and then closes ability', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([buildToken({ id: 71 })]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(await screen.findByText('Placed Tokens: 1')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Double Click First Runtime Token' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pick Popup Ability' }));
    expect(await screen.findByText('Casting: Popup Cast|0.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Popup' }));
    await waitFor(() => {
      expect(screen.queryByTestId('statblock-popup')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Casting: Popup Cast|0.00')).toBeInTheDocument();
  });

  it('does not add tokens whose grid type does not match active runtime grid', async () => {
    battlemapsGetByIdMock.mockResolvedValue(buildBattleMap());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByCampaignMock.mockResolvedValue([
      buildToken({ id: 71, grid_type: 'hex' }),
    ]);

    renderRuntimePage('/world/1/battlemaps/61/runtime');
    expect(await screen.findByText('Runtime Canvas')).toBeInTheDocument();
    expect(await screen.findByText('Campaign Tokens: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add First Token' }));
    expect(screen.getByText('Placed Tokens: 0')).toBeInTheDocument();
  });
});
