import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BattleMapRuntimePage from '../../../src/renderer/pages/BattleMapRuntimePage';

const routerMockState = vi.hoisted(() => ({
  beforeUnloadHandler: null as
    | ((event: { preventDefault: () => void; returnValue?: string }) => void)
    | null,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
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
      onTokenSelect,
      onTokenMove,
    }: {
      tokens: Array<{ instanceId: string; x: number; y: number }>;
      onTokenSelect: (tokenInstanceId: string | null) => void;
      onTokenMove: (
        tokenInstanceId: string,
        position: { x: number; y: number },
      ) => void;
    }) => (
      <div data-testid="runtime-canvas">
        Runtime Canvas Mock
        <p>Canvas Tokens: {tokens.length}</p>
        <button
          type="button"
          onClick={() => {
            if (tokens[0]) {
              onTokenSelect(tokens[0].instanceId);
            }
          }}
        >
          Select First Runtime Token
        </button>
        <button
          type="button"
          onClick={() => {
            if (tokens[0]) {
              onTokenMove(tokens[0].instanceId, { x: 111, y: 222 });
            }
          }}
        >
          Move First Runtime Token
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
        type="button"
        onClick={() =>
          onChange({
            mode: 'triangle' as unknown as BattleMapGridMode,
            cellSize: 9999,
            originX: 24.5,
            originY: -10,
          })
        }
      >
        Trigger Grid Change
      </button>
      <button type="button" onClick={() => onChange(gridConfig)}>
        Trigger Same Grid Change
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            mode: 'hex',
            cellSize: 55,
            originX: 13,
            originY: -17,
          })
        }
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
        type="button"
        onClick={() => onShowInvisibleTokensChange(!showInvisibleTokens)}
      >
        Toggle Invisible Tokens
      </button>
      <button type="button" onClick={() => onSelectCampaign(null)}>
        Clear Campaign
      </button>
      <button
        type="button"
        onClick={() => {
          if (campaigns[1]) {
            onSelectCampaign(campaigns[1].id);
          }
        }}
      >
        Select Second Campaign
      </button>
      <button
        type="button"
        onClick={() => {
          if (tokens[0]) {
            onAddToken(tokens[0]);
          }
        }}
      >
        Add First Token
      </button>
      <button
        type="button"
        onClick={() => {
          if (tokens[1]) {
            onAddToken(tokens[1]);
          }
        }}
      >
        Add Second Token
      </button>
      <button
        type="button"
        onClick={() => {
          if (tokens[2]) {
            onAddToken(tokens[2]);
          }
        }}
      >
        Add Third Token
      </button>
      <button
        type="button"
        onClick={() => {
          if (placedTokens[0]) {
            onSelectPlacedToken(placedTokens[0].instanceId);
          }
        }}
      >
        Select First Placed Token
      </button>
      <button
        type="button"
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

const battlemapsGetByIdMock = vi.fn();
const battlemapsUpdateMock = vi.fn();
const campaignsGetAllByWorldMock = vi.fn();
const tokensGetAllByCampaignMock = vi.fn();

function buildBattleMap(overrides: Partial<BattleMap> = {}): BattleMap {
  return {
    id: 61,
    world_id: 1,
    name: 'Dungeon Grid',
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 31,
    world_id: 1,
    name: 'Campaign One',
    summary: null,
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
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
  };
}

function renderRuntimePage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/world/:id/battlemaps/:battleMapId/runtime"
          element={<BattleMapRuntimePage />}
        />
        <Route
          path="/world/:id/battlemaps"
          element={<div>BattleMaps List</div>}
        />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BattleMapRuntimePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMockState.beforeUnloadHandler = null;
    vi.restoreAllMocks();

    window.db = {
      verses: {
        getAll: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      levels: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      abilities: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addChild: vi.fn(),
        removeChild: vi.fn(),
        getChildren: vi.fn(),
      },
      worlds: {
        getAll: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      campaigns: {
        getAllByWorld: campaignsGetAllByWorldMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      battlemaps: {
        getAllByWorld: vi.fn(),
        getById: battlemapsGetByIdMock,
        add: vi.fn(),
        update: battlemapsUpdateMock,
        delete: vi.fn(),
      },
      tokens: {
        getAllByCampaign: tokensGetAllByCampaignMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      arcs: {
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn(),
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      sessions: {
        getAllByAct: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      scenes: {
        getAllByCampaign: vi.fn(),
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
    } as DbApi;

    campaignsGetAllByWorldMock.mockResolvedValue([]);
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
      async (_id: number, data: { config?: string }) => ({
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
      { config: string },
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
      async (_id: number, data: { config?: string }) => ({
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
});
