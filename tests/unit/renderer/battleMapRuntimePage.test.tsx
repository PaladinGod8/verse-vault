import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BattleMapRuntimePage from '../../../src/renderer/pages/BattleMapRuntimePage';

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );

  return {
    ...actual,
    useBlocker: () => ({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    }),
  };
});

vi.mock(
  '../../../src/renderer/components/runtime/BattleMapRuntimeCanvas',
  () => ({
    default: () => <div data-testid="runtime-canvas">Runtime Canvas Mock</div>,
  }),
);

vi.mock('../../../src/renderer/components/runtime/RuntimeGridControls', () => ({
  default: ({
    onChange,
    saveError,
  }: {
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
      {saveError ? <p>{saveError}</p> : null}
    </div>
  ),
}));

vi.mock('../../../src/renderer/components/runtime/RuntimeTokenPalette', () => ({
  default: () => <div>Runtime Token Palette Mock</div>,
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
});
