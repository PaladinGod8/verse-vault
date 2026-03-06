import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../src/shared/ipcChannels';

type EventHandler = (...args: unknown[]) => unknown;
type IpcHandler = (...args: unknown[]) => unknown;

const registeredEvents: Record<string, EventHandler> = {};
const registeredIpcHandlers: Record<string, IpcHandler> = {};
type ProtocolHandler = (request: { url: string }) => Promise<Response>;
const registeredProtocolHandlers: Record<string, ProtocolHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
const appGetPathMock = vi.fn(() => 'C:\\mock-user-data');
const protocolHandleMock = vi.fn(
  (protocol: string, handler: ProtocolHandler) => {
    registeredProtocolHandlers[protocol] = handler;
  },
);
const netFetchMock = vi.fn();
const mkdirMock = vi.fn(() => Promise.resolve());
const writeFileMock = vi.fn(() => Promise.resolve());
const randomUUIDMock = vi.fn(() => 'test-uuid-1234');
const ipcHandleMock = vi.fn((channel: string, handler: IpcHandler) => {
  registeredIpcHandlers[channel] = handler;
});
const loadURLMock = vi.fn();
const loadFileMock = vi.fn();
const openDevToolsMock = vi.fn();
const getAllWindowsMock = vi.fn();
const browserWindowCtorMock = vi.fn();

class BrowserWindowMock {
  loadURL = loadURLMock;
  loadFile = loadFileMock;
  webContents = {
    openDevTools: openDevToolsMock,
  };

  constructor(options: Record<string, unknown>) {
    browserWindowCtorMock(options);
  }

  static getAllWindows = getAllWindowsMock;
}

const prepareMock = vi.fn();
const transactionMock = vi.fn(
  (callback: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      callback(...args),
);
const getDatabaseMock = vi.fn(() => ({
  prepare: prepareMock,
  transaction: transactionMock,
}));
const closeDatabaseMock = vi.fn();

function setForgeGlobals(devServerUrl: string | undefined) {
  Object.defineProperty(globalThis, 'MAIN_WINDOW_VITE_DEV_SERVER_URL', {
    value: devServerUrl,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'MAIN_WINDOW_VITE_NAME', {
    value: 'main_window',
    configurable: true,
    writable: true,
  });
}

async function importMainWithMocks() {
  vi.resetModules();

  for (const key of Object.keys(registeredEvents)) delete registeredEvents[key];
  for (const key of Object.keys(registeredIpcHandlers))
    delete registeredIpcHandlers[key];
  for (const key of Object.keys(registeredProtocolHandlers))
    delete registeredProtocolHandlers[key];

  vi.clearAllMocks();

  vi.doMock('electron-squirrel-startup', () => false);
  vi.doMock('electron', () => ({
    app: {
      on: appOnMock,
      quit: appQuitMock,
      getPath: appGetPathMock,
    },
    BrowserWindow: BrowserWindowMock,
    ipcMain: {
      handle: ipcHandleMock,
    },
    protocol: {
      handle: protocolHandleMock,
    },
    net: {
      fetch: netFetchMock,
    },
  }));
  vi.doMock('node:crypto', () => ({
    default: { randomUUID: randomUUIDMock },
    randomUUID: randomUUIDMock,
  }));
  vi.doMock('node:fs/promises', () => ({
    default: { mkdir: mkdirMock, writeFile: writeFileMock },
    mkdir: mkdirMock,
    writeFile: writeFileMock,
  }));
  vi.doMock('../../src/database/db', () => ({
    getDatabase: getDatabaseMock,
    closeDatabase: closeDatabaseMock,
    ensureTokenConfigJsonText: (config: unknown) => {
      if (typeof config !== 'string') {
        throw new Error('Token config must be a JSON string');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(config);
      } catch {
        throw new Error('Token config must be valid JSON text');
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Token config must be a JSON object');
      }

      return config;
    },
  }));

  await import('../../src/main');
}

describe('main process', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('registers app lifecycle events and IPC handlers', async () => {
    const versesSelectAllMock = vi.fn(() => [{ id: 1 }]);
    const versesInsertRunMock = vi.fn(() => ({ lastInsertRowid: 5 }));
    const versesUpdateRunMock = vi.fn();
    const versesDeleteRunMock = vi.fn();
    const versesSelectByIdGetMock = vi.fn((id: number) => ({ id }));

    const worldsSelectAllMock = vi.fn(() => [{ id: 1, name: 'Alpha' }]);
    const worldsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 6 }));
    const worldsUpdateRunMock = vi.fn();
    const worldsDeleteRunMock = vi.fn();
    const worldsMarkViewedRunMock = vi.fn();
    const worldsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        name: `World ${id}`,
        thumbnail: null,
        short_description: null,
        last_viewed_at: id === 7 ? '2026-01-01 00:00:00' : null,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });

    const levelsSelectAllByWorldMock = vi.fn(() => [
      {
        id: 10,
        world_id: 1,
        name: 'Level One',
        category: 'Quest',
        description: null,
      },
    ]);
    const levelsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 8 }));
    const levelsUpdateRunMock = vi.fn();
    const levelsDeleteRunMock = vi.fn();
    const levelsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 999) return null;
      return {
        id,
        world_id: 1,
        name: `Level ${id}`,
        category: 'Quest',
        description: null,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const abilitiesSelectAllByWorldMock = vi.fn(() => [
      {
        id: 20,
        world_id: 1,
        name: 'Ability One',
        description: null,
        type: 'active',
        updated_at: '2026-01-02 00:00:00',
      },
    ]);
    const abilitiesInsertRunMock = vi.fn(() => ({ lastInsertRowid: 11 }));
    const abilitiesUpdateRunMock = vi.fn();
    const abilitiesDeleteRunMock = vi.fn();
    const abilityChildrenInsertRunMock = vi.fn();
    const abilityChildrenDeleteRunMock = vi.fn();
    const abilityChildrenSelectAllMock = vi.fn(() => [
      {
        id: 22,
        world_id: 1,
        name: 'Child Ability',
        description: null,
        type: 'passive',
      },
    ]);
    const abilitiesSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 777) return null;
      return {
        id,
        world_id: 1,
        name: `Ability ${id}`,
        description: null,
        type: 'active',
        passive_subtype: null,
        level_id: null,
        effects: '[]',
        conditions: '[]',
        cast_cost: '{}',
        trigger: null,
        pick_count: null,
        pick_timing: null,
        pick_is_permanent: 0,
        range_cells: null,
        aoe_shape: null,
        aoe_size_cells: null,
        target_type: null,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const abilitiesSelectIdAndWorldByIdGetMock = vi.fn((id: number) => {
      if (id === 1) return { id: 1, world_id: 1 };
      if (id === 2) return { id: 2, world_id: 1 };
      if (id === 3) return { id: 3, world_id: 2 };
      return undefined;
    });

    const campaignsSelectAllByWorldMock = vi.fn(() => [
      { id: 31, world_id: 1, name: 'Campaign One' },
    ]);
    const campaignsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        world_id: 1,
        name: `Campaign ${id}`,
        summary: null,
        config: '{}',
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const campaignsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 30 }));
    const campaignsUpdateRunMock = vi.fn();
    const campaignsDeleteRunMock = vi.fn();
    const battlemapsSelectAllByWorldMock = vi.fn(() => [
      { id: 61, world_id: 1, name: 'Dungeon Grid', config: '{}' },
    ]);
    const battlemapsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        world_id: 1,
        name: `BattleMap ${id}`,
        config: '{"size":20}',
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const battlemapsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 61 }));
    const battlemapsUpdateRunMock = vi.fn();
    const battlemapsDeleteRunMock = vi.fn();
    const tokensSelectAllByCampaignMock = vi.fn(() => [
      {
        id: 71,
        world_id: 1,
        campaign_id: 31,
        name: 'Goblin',
        image_src: null,
        config: '{}',
        is_visible: 1,
      },
    ]);
    const tokensSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) {
        return null;
      }

      return {
        id,
        world_id: 1,
        campaign_id: 31,
        name: `Token ${id}`,
        image_src: null,
        config: '{}',
        is_visible: 1,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const tokensInsertRunMock = vi.fn(() => ({ lastInsertRowid: 71 }));
    const tokensUpdateRunMock = vi.fn();
    const tokensDeleteRunMock = vi.fn();

    const arcsSelectAllByCampaignMock = vi.fn(() => [
      { id: 10, campaign_id: 1, name: 'Arc One', sort_order: 0 },
    ]);
    const arcsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        campaign_id: 1,
        name: `Arc ${id}`,
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const arcsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 10 }));
    const arcsUpdateRunMock = vi.fn();
    const arcsSortOrderUpdateRunMock = vi.fn();
    const arcsDeleteRunMock = vi.fn();
    const arcsNextSortOrderGetMock = vi.fn(() => ({ next: 1 }));
    const arcsCampaignForDeleteGetMock = vi.fn((id: number) => {
      if (id === 10) return { campaign_id: 1 };
      return undefined;
    });
    const arcsSiblingIdsAllMock = vi.fn(() => [{ id: 10 }]);

    const actsSelectAllByArcMock = vi.fn(() => [
      { id: 20, arc_id: 10, name: 'Act One', sort_order: 0 },
    ]);
    const actsSelectAllByCampaignMock = vi.fn(() => [
      { id: 20, arc_id: 10, name: 'Act One', sort_order: 0 },
    ]);
    const actsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        arc_id: 10,
        name: `Act ${id}`,
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const actsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 20 }));
    const actsUpdateRunMock = vi.fn();
    const actsSortOrderUpdateRunMock = vi.fn();
    const actsDeleteRunMock = vi.fn();
    const actsNextSortOrderGetMock = vi.fn(() => ({ next: 1 }));
    const actsArcForDeleteGetMock = vi.fn((id: number) => {
      if (id === 20) return { arc_id: 10 };
      return undefined;
    });
    const actsSiblingIdsAllMock = vi.fn(() => [{ id: 20 }]);

    const sessionsSelectAllByActMock = vi.fn(() => [
      { id: 41, act_id: 20, name: 'Session One', planned_at: null },
    ]);
    const sessionsSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        act_id: 20,
        name: `Session ${id}`,
        notes: null,
        planned_at:
          id === 40
            ? '2026-03-15T09:30'
            : id === 41
              ? '2026-03-17T10:45'
              : null,
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const sessionsInsertRunMock = vi.fn(() => ({ lastInsertRowid: 40 }));
    const sessionsUpdateRunMock = vi.fn();
    const sessionsSortOrderUpdateRunMock = vi.fn();
    const sessionsDeleteRunMock = vi.fn();
    const sessionsNextSortOrderGetMock = vi.fn(() => ({ next_sort_order: 7 }));
    const sessionsActForDeleteGetMock = vi.fn((id: number) => {
      if (id === 43) return { act_id: 20 };
      return undefined;
    });
    const sessionsSiblingIdsAllMock = vi.fn(() => [{ id: 41 }, { id: 42 }]);

    const scenesSelectAllByCampaignMock = vi.fn(() => [
      {
        id: 51,
        session_id: 40,
        name: 'Scene One',
        notes: null,
        payload: '{}',
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
        session_name: 'Session One',
        act_id: 20,
        act_name: 'Act One',
        arc_id: 10,
        arc_name: 'Arc One',
      },
    ]);
    const scenesSelectAllBySessionMock = vi.fn(() => [
      { id: 51, session_id: 40, name: 'Scene One' },
    ]);
    const scenesSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        session_id: 40,
        name: `Scene ${id}`,
        notes: null,
        payload: '{}',
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });
    const scenesInsertRunMock = vi.fn(() => ({ lastInsertRowid: 50 }));
    const scenesUpdateRunMock = vi.fn();
    const scenesSortOrderUpdateRunMock = vi.fn();
    const scenesDeleteRunMock = vi.fn();
    const scenesNextSortOrderGetMock = vi.fn(() => ({ next_sort_order: 9 }));
    const scenesMoveNextSortOrderGetMock = vi.fn(() => ({ nextSortOrder: 6 }));
    const scenesSessionForDeleteGetMock = vi.fn((id: number) => {
      if (id === 53) return { session_id: 40 };
      return undefined;
    });
    const scenesSiblingIdsAllMock = vi.fn(() => [{ id: 51 }, { id: 52 }]);

    const statblocksSelectAllByWorldMock = vi.fn(() => [
      { id: 91, world_id: 1, name: 'Goblin Warrior', config: '{}' },
    ]);
    const statblocksSelectAllByCampaignMock = vi.fn(() => [
      { id: 92, world_id: 1, campaign_id: 31, name: 'Orc Shaman', config: '{}' },
    ]);
    const statblocksSelectByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return null;
      return {
        id,
        world_id: 1,
        campaign_id: null,
        name: `StatBlock ${id}`,
        config: '{}',
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      };
    });

    prepareMock.mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM worlds ORDER BY updated_at DESC')) {
        return { all: worldsSelectAllMock };
      }
      if (sql.includes('SELECT * FROM worlds WHERE id = ?')) {
        return { get: worldsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO worlds')) {
        return { run: worldsInsertRunMock };
      }
      if (sql.includes("UPDATE worlds SET last_viewed_at = datetime('now')")) {
        return { run: worldsMarkViewedRunMock };
      }
      if (sql.includes('UPDATE worlds SET')) {
        return { run: worldsUpdateRunMock };
      }
      if (sql.includes('DELETE FROM worlds WHERE id = ?')) {
        return { run: worldsDeleteRunMock };
      }

      if (sql.includes('SELECT * FROM verses ORDER BY created_at DESC')) {
        return { all: versesSelectAllMock };
      }
      if (sql.includes('INSERT INTO verses')) {
        return { run: versesInsertRunMock };
      }
      if (sql.includes('UPDATE verses SET')) {
        return { run: versesUpdateRunMock };
      }
      if (sql.includes('DELETE FROM verses WHERE id = ?')) {
        return { run: versesDeleteRunMock };
      }
      if (sql.includes('SELECT * FROM verses WHERE id = ?')) {
        return { get: versesSelectByIdGetMock };
      }

      if (sql.includes('SELECT * FROM levels WHERE world_id = ?')) {
        return { all: levelsSelectAllByWorldMock };
      }
      if (sql.includes('SELECT * FROM levels WHERE id = ?')) {
        return { get: levelsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO levels')) {
        return { run: levelsInsertRunMock };
      }
      if (sql.includes('UPDATE levels SET')) {
        return { run: levelsUpdateRunMock };
      }
      if (sql.includes('DELETE FROM levels WHERE id = ?')) {
        return { run: levelsDeleteRunMock };
      }

      if (sql.includes('SELECT * FROM abilities WHERE world_id = ?')) {
        return { all: abilitiesSelectAllByWorldMock };
      }
      if (sql.includes('SELECT id, world_id FROM abilities WHERE id = ?')) {
        return { get: abilitiesSelectIdAndWorldByIdGetMock };
      }
      if (sql.includes('SELECT * FROM abilities WHERE id = ?')) {
        return { get: abilitiesSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO abilities')) {
        return { run: abilitiesInsertRunMock };
      }
      if (sql.includes('UPDATE abilities SET')) {
        return { run: abilitiesUpdateRunMock };
      }
      if (sql.includes('DELETE FROM abilities WHERE id = ?')) {
        return { run: abilitiesDeleteRunMock };
      }
      if (
        sql.includes(
          'DELETE FROM ability_children WHERE parent_id = ? AND child_id = ?',
        )
      ) {
        return { run: abilityChildrenDeleteRunMock };
      }
      if (sql.includes('INSERT INTO ability_children')) {
        return { run: abilityChildrenInsertRunMock };
      }
      if (sql.includes('FROM ability_children AS relation')) {
        return { all: abilityChildrenSelectAllMock };
      }

      if (sql.includes('SELECT * FROM campaigns WHERE world_id = ?')) {
        return { all: campaignsSelectAllByWorldMock };
      }
      if (sql.includes('SELECT * FROM campaigns WHERE id = ?')) {
        return { get: campaignsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO campaigns')) {
        return { run: campaignsInsertRunMock };
      }
      if (sql.includes('UPDATE campaigns SET')) {
        return { run: campaignsUpdateRunMock };
      }
      if (sql.includes('DELETE FROM campaigns WHERE id = ?')) {
        return { run: campaignsDeleteRunMock };
      }

      if (
        sql.includes(
          'SELECT * FROM battlemaps WHERE world_id = ? ORDER BY updated_at DESC, id DESC',
        )
      ) {
        return { all: battlemapsSelectAllByWorldMock };
      }
      if (sql.includes('SELECT * FROM battlemaps WHERE id = ?')) {
        return { get: battlemapsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO battlemaps')) {
        return { run: battlemapsInsertRunMock };
      }
      if (sql.includes('UPDATE battlemaps SET')) {
        return { run: battlemapsUpdateRunMock };
      }
      if (sql.includes('DELETE FROM battlemaps WHERE id = ?')) {
        return { run: battlemapsDeleteRunMock };
      }

      if (
        sql.includes(
          'SELECT * FROM tokens WHERE campaign_id = ? ORDER BY updated_at DESC, id DESC',
        )
      ) {
        return { all: tokensSelectAllByCampaignMock };
      }
      if (sql.includes('SELECT * FROM tokens WHERE id = ?')) {
        return { get: tokensSelectByIdGetMock };
      }
      if (
        sql.includes(
          'INSERT INTO tokens (world_id, campaign_id, name, image_src, config, grid_type, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
      ) {
        return { run: tokensInsertRunMock };
      }
      if (sql.includes('UPDATE tokens SET')) {
        return { run: tokensUpdateRunMock };
      }
      if (sql.includes('DELETE FROM tokens WHERE id = ?')) {
        return { run: tokensDeleteRunMock };
      }

      if (
        sql.includes(
          'SELECT * FROM arcs WHERE campaign_id = ? ORDER BY sort_order ASC, id ASC',
        )
      ) {
        return { all: arcsSelectAllByCampaignMock };
      }
      if (sql.includes('SELECT * FROM arcs WHERE id = ?')) {
        return { get: arcsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO arcs')) {
        return { run: arcsInsertRunMock };
      }
      if (
        sql.includes(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM arcs WHERE campaign_id = ?',
        )
      ) {
        return { get: arcsNextSortOrderGetMock };
      }
      if (sql === 'UPDATE arcs SET sort_order = ? WHERE id = ?') {
        return { run: arcsSortOrderUpdateRunMock };
      }
      if (sql.includes('UPDATE arcs SET')) {
        return { run: arcsUpdateRunMock };
      }
      if (sql.includes('SELECT campaign_id FROM arcs WHERE id = ?')) {
        return { get: arcsCampaignForDeleteGetMock };
      }
      if (
        sql.includes(
          'SELECT id FROM arcs WHERE campaign_id = ? ORDER BY sort_order ASC, id ASC',
        )
      ) {
        return { all: arcsSiblingIdsAllMock };
      }
      if (sql.includes('DELETE FROM arcs WHERE id = ?')) {
        return { run: arcsDeleteRunMock };
      }

      if (
        sql.includes(
          'SELECT * FROM acts WHERE arc_id = ? ORDER BY sort_order ASC, id ASC',
        )
      ) {
        return { all: actsSelectAllByArcMock };
      }
      if (sql.includes('SELECT acts.*') && sql.includes('JOIN arcs')) {
        return { all: actsSelectAllByCampaignMock };
      }
      if (sql.includes('SELECT * FROM acts WHERE id = ?')) {
        return { get: actsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO acts')) {
        return { run: actsInsertRunMock };
      }
      if (
        sql.includes(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM acts WHERE arc_id = ?',
        )
      ) {
        return { get: actsNextSortOrderGetMock };
      }
      if (sql === 'UPDATE acts SET sort_order = ? WHERE id = ?') {
        return { run: actsSortOrderUpdateRunMock };
      }
      if (sql.includes('UPDATE acts SET')) {
        return { run: actsUpdateRunMock };
      }
      if (sql.includes('SELECT arc_id FROM acts WHERE id = ?')) {
        return { get: actsArcForDeleteGetMock };
      }
      if (
        sql.includes(
          'SELECT id FROM acts WHERE arc_id = ? ORDER BY sort_order ASC, id ASC',
        )
      ) {
        return { all: actsSiblingIdsAllMock };
      }
      if (sql.includes('DELETE FROM acts WHERE id = ?')) {
        return { run: actsDeleteRunMock };
      }

      if (sql.includes('SELECT * FROM sessions WHERE act_id = ?')) {
        return { all: sessionsSelectAllByActMock };
      }
      if (
        sql.includes(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM sessions WHERE act_id = ?',
        )
      ) {
        return { get: sessionsNextSortOrderGetMock };
      }
      if (
        sql.includes(
          'SELECT id FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
        )
      ) {
        return { all: sessionsSiblingIdsAllMock };
      }
      if (sql.includes('SELECT act_id FROM sessions WHERE id = ?')) {
        return { get: sessionsActForDeleteGetMock };
      }
      if (sql.includes('SELECT * FROM sessions WHERE id = ?')) {
        return { get: sessionsSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO sessions')) {
        return { run: sessionsInsertRunMock };
      }
      if (sql === 'UPDATE sessions SET sort_order = ? WHERE id = ?') {
        return { run: sessionsSortOrderUpdateRunMock };
      }
      if (sql.includes('UPDATE sessions SET')) {
        return { run: sessionsUpdateRunMock };
      }
      if (sql.includes('DELETE FROM sessions WHERE id = ?')) {
        return { run: sessionsDeleteRunMock };
      }

      if (
        sql.includes('FROM scenes') &&
        sql.includes('INNER JOIN sessions') &&
        sql.includes('WHERE arcs.campaign_id = ?')
      ) {
        return { all: scenesSelectAllByCampaignMock };
      }
      if (sql.includes('SELECT * FROM scenes WHERE session_id = ?')) {
        return { all: scenesSelectAllBySessionMock };
      }
      if (
        sql.includes(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM scenes WHERE session_id = ?',
        )
      ) {
        return { get: scenesNextSortOrderGetMock };
      }
      if (
        sql.includes(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder FROM scenes WHERE session_id = ?',
        )
      ) {
        return { get: scenesMoveNextSortOrderGetMock };
      }
      if (
        sql.includes(
          'SELECT id FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
        )
      ) {
        return { all: scenesSiblingIdsAllMock };
      }
      if (sql.includes('SELECT session_id FROM scenes WHERE id = ?')) {
        return { get: scenesSessionForDeleteGetMock };
      }
      if (sql.includes('SELECT * FROM scenes WHERE id = ?')) {
        return { get: scenesSelectByIdGetMock };
      }
      if (sql.includes('INSERT INTO scenes')) {
        return { run: scenesInsertRunMock };
      }
      if (sql === 'UPDATE scenes SET sort_order = ? WHERE id = ?') {
        return { run: scenesSortOrderUpdateRunMock };
      }
      if (sql.includes('UPDATE scenes SET')) {
        return { run: scenesUpdateRunMock };
      }
      if (sql.includes('DELETE FROM scenes WHERE id = ?')) {
        return { run: scenesDeleteRunMock };
      }

      if (sql.includes('SELECT * FROM statblocks WHERE world_id = ?')) {
        return { all: statblocksSelectAllByWorldMock };
      }
      if (sql.includes('SELECT * FROM statblocks WHERE campaign_id = ?')) {
        return { all: statblocksSelectAllByCampaignMock };
      }
      if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
        return { get: statblocksSelectByIdGetMock };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    setForgeGlobals('http://localhost:5173');
    await importMainWithMocks();

    expect(appQuitMock).not.toHaveBeenCalled();
    expect(appOnMock).toHaveBeenCalledTimes(4);

    expect(registeredEvents.ready).toBeTypeOf('function');
    expect(registeredEvents['before-quit']).toBeTypeOf('function');
    expect(registeredEvents['window-all-closed']).toBeTypeOf('function');
    expect(registeredEvents.activate).toBeTypeOf('function');

    await registeredEvents.ready();

    expect(getDatabaseMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledTimes(8);
    expect(browserWindowCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 800,
        height: 600,
        webPreferences: expect.objectContaining({
          contextIsolation: true,
          nodeIntegration: false,
        }),
      }),
    );
    expect(loadURLMock).toHaveBeenCalledWith('http://localhost:5173');
    expect(loadFileMock).not.toHaveBeenCalled();
    expect(openDevToolsMock).toHaveBeenCalledTimes(1);

    expect(ipcHandleMock).toHaveBeenCalledTimes(71);

    const getAllResult = registeredIpcHandlers[IPC.VERSES_GET_ALL]({});
    expect(versesSelectAllMock).toHaveBeenCalledTimes(1);
    expect(getAllResult).toEqual([{ id: 1 }]);

    const addResult = registeredIpcHandlers[IPC.VERSES_ADD](
      {},
      { text: 'abc' },
    );
    expect(versesInsertRunMock).toHaveBeenCalledWith('abc', null, null);
    expect(versesSelectByIdGetMock).toHaveBeenCalledWith(5);
    expect(addResult).toEqual({ id: 5 });

    const updateResult = registeredIpcHandlers[IPC.VERSES_UPDATE]({}, 9, {
      reference: 'John 3:16',
    });
    expect(versesUpdateRunMock).toHaveBeenCalledWith(
      null,
      'John 3:16',
      null,
      9,
    );
    expect(versesSelectByIdGetMock).toHaveBeenCalledWith(9);
    expect(updateResult).toEqual({ id: 9 });

    const deleteResult = registeredIpcHandlers[IPC.VERSES_DELETE]({}, 4);
    expect(versesDeleteRunMock).toHaveBeenCalledWith(4);
    expect(deleteResult).toEqual({ id: 4 });

    const worldsGetAllResult = registeredIpcHandlers[IPC.WORLDS_GET_ALL]({});
    expect(worldsSelectAllMock).toHaveBeenCalledTimes(1);
    expect(worldsGetAllResult).toEqual([{ id: 1, name: 'Alpha' }]);

    const worldByIdResult = registeredIpcHandlers[IPC.WORLDS_GET_BY_ID]({}, 2);
    expect(worldsSelectByIdGetMock).toHaveBeenCalledWith(2);
    expect(worldByIdResult).toMatchObject({ id: 2 });

    const missingWorldResult = registeredIpcHandlers[IPC.WORLDS_GET_BY_ID](
      {},
      404,
    );
    expect(missingWorldResult).toBeNull();

    const worldAddResult = registeredIpcHandlers[IPC.WORLDS_ADD](
      {},
      {
        name: '  New World  ',
      },
    );
    expect(worldsInsertRunMock).toHaveBeenCalledWith('New World', null, null);
    expect(worldsSelectByIdGetMock).toHaveBeenCalledWith(6);
    expect(worldAddResult).toMatchObject({ id: 6 });

    expect(() =>
      registeredIpcHandlers[IPC.WORLDS_ADD]({}, { name: '   ' }),
    ).toThrowError('World name is required');

    const worldUpdateResult = registeredIpcHandlers[IPC.WORLDS_UPDATE]({}, 9, {
      thumbnail: 'cover.png',
    });
    const partialUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE worlds SET') &&
        sql.includes('thumbnail = ?'),
    )?.[0];
    expect(partialUpdateSql).toContain("updated_at = datetime('now')");
    expect(partialUpdateSql).not.toContain('name = ?');
    expect(partialUpdateSql).not.toContain('short_description = ?');
    expect(worldsUpdateRunMock).toHaveBeenCalledWith('cover.png', 9);
    expect(worldUpdateResult).toMatchObject({ id: 9 });

    const timestampOnlyUpdateResult = registeredIpcHandlers[IPC.WORLDS_UPDATE](
      {},
      10,
      {},
    );
    const timestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql === "UPDATE worlds SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(timestampOnlySql).toBe(
      "UPDATE worlds SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(worldsUpdateRunMock).toHaveBeenLastCalledWith(10);
    expect(timestampOnlyUpdateResult).toMatchObject({ id: 10 });

    const worldDeleteResult = registeredIpcHandlers[IPC.WORLDS_DELETE]({}, 12);
    expect(worldsDeleteRunMock).toHaveBeenCalledWith(12);
    expect(worldDeleteResult).toEqual({ id: 12 });

    const worldMarkViewedResult = registeredIpcHandlers[IPC.WORLDS_MARK_VIEWED](
      {},
      7,
    );
    expect(worldsMarkViewedRunMock).toHaveBeenCalledWith(7);
    expect(worldMarkViewedResult).toMatchObject({
      id: 7,
      last_viewed_at: '2026-01-01 00:00:00',
    });

    const worldImportImageResult = await registeredIpcHandlers[
      IPC.WORLDS_IMPORT_IMAGE
    ](
      {},
      {
        fileName: 'thumbnail.png',
        mimeType: 'image/png',
        bytes: new Uint8Array([1, 2, 3]),
      },
    );
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.stringContaining('world-images'),
      { recursive: true },
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('world-images'),
      expect.any(Uint8Array),
    );
    expect(worldImportImageResult).toMatchObject({
      image_src: expect.stringMatching(/^vv-media:\/\/world-images\//),
    });

    // Test vv-media protocol handler serves world-images host
    netFetchMock.mockResolvedValueOnce(new Response('img', { status: 200 }));
    const worldMediaResponse = await registeredProtocolHandlers['vv-media']({
      url: 'vv-media://world-images/test-image.png',
    });
    expect(worldMediaResponse.status).toBe(200);

    // Test vv-media protocol handler returns 404 for unknown host
    const unknownHostResponse = await registeredProtocolHandlers['vv-media']({
      url: 'vv-media://unknown-host/test.png',
    });
    expect(unknownHostResponse.status).toBe(404);

    const levelsGetAllByWorldResult = registeredIpcHandlers[
      IPC.LEVELS_GET_ALL_BY_WORLD
    ]({}, 1);
    expect(levelsSelectAllByWorldMock).toHaveBeenCalledTimes(1);
    expect(levelsGetAllByWorldResult).toEqual([
      {
        id: 10,
        world_id: 1,
        name: 'Level One',
        category: 'Quest',
        description: null,
      },
    ]);

    const levelByIdResult = registeredIpcHandlers[IPC.LEVELS_GET_BY_ID]({}, 10);
    expect(levelsSelectByIdGetMock).toHaveBeenCalledWith(10);
    expect(levelByIdResult).toMatchObject({ id: 10 });

    const missingLevelResult = registeredIpcHandlers[IPC.LEVELS_GET_BY_ID](
      {},
      999,
    );
    expect(missingLevelResult).toBeNull();

    const levelAddResult = registeredIpcHandlers[IPC.LEVELS_ADD](
      {},
      { world_id: 1, name: '  New Level  ', category: '  Quest  ' },
    );
    expect(levelsInsertRunMock).toHaveBeenCalledWith(
      1,
      'New Level',
      'Quest',
      null,
    );
    expect(levelsSelectByIdGetMock).toHaveBeenCalledWith(8);
    expect(levelAddResult).toMatchObject({ id: 8 });

    expect(() =>
      registeredIpcHandlers[IPC.LEVELS_ADD](
        {},
        { world_id: 1, name: '   ', category: 'Quest' },
      ),
    ).toThrowError('Level name is required');

    expect(() =>
      registeredIpcHandlers[IPC.LEVELS_ADD](
        {},
        { world_id: 1, name: 'Name', category: '   ' },
      ),
    ).toThrowError('Level category is required');

    const levelUpdateResult = registeredIpcHandlers[IPC.LEVELS_UPDATE]({}, 10, {
      name: 'Updated Level',
      category: 'Race',
    });
    const levelUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE levels SET') &&
        sql.includes('name = ?'),
    )?.[0];
    expect(levelUpdateSql).toContain("updated_at = datetime('now')");
    expect(levelsUpdateRunMock).toHaveBeenCalledWith(
      'Updated Level',
      'Race',
      10,
    );
    expect(levelUpdateResult).toMatchObject({ id: 10 });

    const levelDeleteResult = registeredIpcHandlers[IPC.LEVELS_DELETE]({}, 10);
    expect(levelsDeleteRunMock).toHaveBeenCalledWith(10);
    expect(levelDeleteResult).toEqual({ id: 10 });

    const abilitiesGetAllByWorldResult = registeredIpcHandlers[
      IPC.ABILITIES_GET_ALL_BY_WORLD
    ]({}, 1);
    expect(abilitiesSelectAllByWorldMock).toHaveBeenCalledWith(1);
    expect(abilitiesGetAllByWorldResult).toEqual([
      {
        id: 20,
        world_id: 1,
        name: 'Ability One',
        description: null,
        type: 'active',
        updated_at: '2026-01-02 00:00:00',
      },
    ]);

    const abilityByIdResult = registeredIpcHandlers[IPC.ABILITIES_GET_BY_ID](
      {},
      20,
    );
    expect(abilitiesSelectByIdGetMock).toHaveBeenCalledWith(20);
    expect(abilityByIdResult).toMatchObject({ id: 20 });

    const missingAbilityResult = registeredIpcHandlers[IPC.ABILITIES_GET_BY_ID](
      {},
      777,
    );
    expect(missingAbilityResult).toBeNull();

    const abilityAddResult = registeredIpcHandlers[IPC.ABILITIES_ADD](
      {},
      {
        world_id: 1,
        name: '  New Ability  ',
        type: '  active  ',
      },
    );
    expect(abilitiesInsertRunMock).toHaveBeenCalledWith(
      1,
      'New Ability',
      null,
      'active',
      null,
      null,
      '[]',
      '[]',
      '{}',
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      null,
    );
    expect(abilitiesSelectByIdGetMock).toHaveBeenCalledWith(11);
    expect(abilityAddResult).toMatchObject({ id: 11 });

    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD](
        {},
        { world_id: 1, name: '   ', type: 'active' },
      ),
    ).toThrowError('Ability name is required');
    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD](
        {},
        { world_id: 1, name: 'Ability', type: '   ' },
      ),
    ).toThrowError('Ability type is required');

    const abilityUpdateResult = registeredIpcHandlers[IPC.ABILITIES_UPDATE](
      {},
      20,
      {
        name: '  Updated Ability  ',
        pick_count: 2,
        pick_is_permanent: 1,
      },
    );
    const abilityUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE abilities SET') &&
        sql.includes('name = ?') &&
        sql.includes('pick_count = ?') &&
        sql.includes('pick_is_permanent = ?'),
    )?.[0];
    expect(abilityUpdateSql).toContain("updated_at = datetime('now')");
    expect(abilityUpdateSql).not.toContain('type = ?');
    expect(abilitiesUpdateRunMock).toHaveBeenCalledWith(
      'Updated Ability',
      2,
      1,
      20,
    );
    expect(abilityUpdateResult).toMatchObject({ id: 20 });

    const abilityTimestampOnlyUpdateResult = registeredIpcHandlers[
      IPC.ABILITIES_UPDATE
    ]({}, 21, {});
    const abilityTimestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql ===
        "UPDATE abilities SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(abilityTimestampOnlySql).toBe(
      "UPDATE abilities SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(abilitiesUpdateRunMock).toHaveBeenLastCalledWith(21);
    expect(abilityTimestampOnlyUpdateResult).toMatchObject({ id: 21 });

    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_UPDATE]({}, 20, { name: '   ' }),
    ).toThrowError('Ability name cannot be empty');
    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_UPDATE]({}, 20, { type: '   ' }),
    ).toThrowError('Ability type cannot be empty');

    const abilityDeleteResult = registeredIpcHandlers[IPC.ABILITIES_DELETE](
      {},
      20,
    );
    expect(abilitiesDeleteRunMock).toHaveBeenCalledWith(20);
    expect(abilityDeleteResult).toEqual({ id: 20 });

    const addChildResult = registeredIpcHandlers[IPC.ABILITIES_ADD_CHILD](
      {},
      { parent_id: 1, child_id: 2 },
    );
    expect(abilitiesSelectIdAndWorldByIdGetMock).toHaveBeenCalledWith(1);
    expect(abilitiesSelectIdAndWorldByIdGetMock).toHaveBeenCalledWith(2);
    expect(abilityChildrenInsertRunMock).toHaveBeenCalledWith(1, 2);
    expect(addChildResult).toEqual({ parent_id: 1, child_id: 2 });

    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD_CHILD](
        {},
        { parent_id: 9, child_id: 9 },
      ),
    ).toThrowError('Parent ability cannot be linked to itself');
    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD_CHILD](
        {},
        { parent_id: 999, child_id: 2 },
      ),
    ).toThrowError('Parent ability not found');
    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD_CHILD](
        {},
        { parent_id: 1, child_id: 999 },
      ),
    ).toThrowError('Child ability not found');
    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD_CHILD](
        {},
        { parent_id: 1, child_id: 3 },
      ),
    ).toThrowError('Parent and child abilities must belong to the same world');

    abilityChildrenInsertRunMock.mockImplementationOnce(() => {
      const duplicateError = new Error('duplicate') as Error & { code: string };
      duplicateError.code = 'SQLITE_CONSTRAINT_UNIQUE';
      throw duplicateError;
    });
    expect(() =>
      registeredIpcHandlers[IPC.ABILITIES_ADD_CHILD](
        {},
        { parent_id: 1, child_id: 2 },
      ),
    ).toThrowError('Child ability link already exists');

    const removeChildResult = registeredIpcHandlers[IPC.ABILITIES_REMOVE_CHILD](
      {},
      { parent_id: 1, child_id: 2 },
    );
    expect(abilityChildrenDeleteRunMock).toHaveBeenCalledWith(1, 2);
    expect(removeChildResult).toEqual({ parent_id: 1, child_id: 2 });

    const getChildrenResult = registeredIpcHandlers[IPC.ABILITIES_GET_CHILDREN](
      {},
      1,
    );
    expect(abilityChildrenSelectAllMock).toHaveBeenCalledWith(1);
    expect(getChildrenResult).toEqual([
      {
        id: 22,
        world_id: 1,
        name: 'Child Ability',
        description: null,
        type: 'passive',
      },
    ]);

    // Casting range overlay field tests for ABILITIES_ADD
    const abilityAddWithRangeResult = registeredIpcHandlers[IPC.ABILITIES_ADD](
      {},
      {
        world_id: 1,
        name: 'Arc Flash',
        type: 'active',
        range_cells: 6,
        aoe_shape: 'circle',
        aoe_size_cells: 3,
        target_type: 'tile',
      },
    );
    expect(abilitiesInsertRunMock).toHaveBeenCalledWith(
      1,
      'Arc Flash',
      null,
      'active',
      null,
      null,
      '[]',
      '[]',
      '{}',
      null,
      null,
      null,
      0,
      6,
      'circle',
      3,
      'tile',
    );
    expect(abilityAddWithRangeResult).toMatchObject({ id: 11 });

    // Test that new fields default to null when omitted
    const abilityAddWithoutRangeResult = registeredIpcHandlers[
      IPC.ABILITIES_ADD
    ](
      {},
      {
        world_id: 1,
        name: 'Basic Move',
        type: 'active',
      },
    );
    expect(abilitiesInsertRunMock).toHaveBeenLastCalledWith(
      1,
      'Basic Move',
      null,
      'active',
      null,
      null,
      '[]',
      '[]',
      '{}',
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      null,
    );
    expect(abilityAddWithoutRangeResult).toMatchObject({ id: 11 });

    // Casting range overlay field tests for ABILITIES_UPDATE - partial update
    const abilityUpdateRangeOnlyResult = registeredIpcHandlers[
      IPC.ABILITIES_UPDATE
    ]({}, 20, {
      range_cells: 5,
    });
    const abilityUpdateRangeSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE abilities SET') &&
        sql.includes('range_cells = ?') &&
        !sql.includes('aoe_shape = ?'),
    )?.[0];
    expect(abilityUpdateRangeSql).toContain("updated_at = datetime('now')");
    expect(abilitiesUpdateRunMock).toHaveBeenCalledWith(5, 20);
    expect(abilityUpdateRangeOnlyResult).toMatchObject({ id: 20 });

    // Test UPDATE with explicit null to clear a field
    const abilityUpdateClearShapeResult = registeredIpcHandlers[
      IPC.ABILITIES_UPDATE
    ]({}, 20, {
      aoe_shape: null,
    });
    const abilityUpdateClearShapeSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE abilities SET') &&
        sql.includes('aoe_shape = ?'),
    )?.[0];
    expect(abilityUpdateClearShapeSql).toBeDefined();
    expect(abilitiesUpdateRunMock).toHaveBeenCalledWith(null, 20);
    expect(abilityUpdateClearShapeResult).toMatchObject({ id: 20 });

    // Test UPDATE with all casting fields
    const abilityUpdateAllCastingResult = registeredIpcHandlers[
      IPC.ABILITIES_UPDATE
    ]({}, 20, {
      range_cells: 8,
      aoe_shape: 'cone',
      aoe_size_cells: 4,
      target_type: 'token',
    });
    const abilityUpdateAllCastingSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE abilities SET') &&
        sql.includes('range_cells = ?') &&
        sql.includes('aoe_shape = ?') &&
        sql.includes('aoe_size_cells = ?') &&
        sql.includes('target_type = ?'),
    )?.[0];
    expect(abilityUpdateAllCastingSql).toBeDefined();
    expect(abilityUpdateAllCastingResult).toMatchObject({ id: 20 });

    // CAMPAIGNS
    const campaignsGetAllByWorldResult = registeredIpcHandlers[
      IPC.CAMPAIGNS_GET_ALL_BY_WORLD
    ]({}, 1);
    expect(campaignsSelectAllByWorldMock).toHaveBeenCalledTimes(1);
    expect(campaignsGetAllByWorldResult).toEqual([
      { id: 31, world_id: 1, name: 'Campaign One' },
    ]);

    const campaignByIdResult = registeredIpcHandlers[IPC.CAMPAIGNS_GET_BY_ID](
      {},
      31,
    );
    expect(campaignsSelectByIdGetMock).toHaveBeenCalledWith(31);
    expect(campaignByIdResult).toMatchObject({ id: 31 });

    const missingCampaignResult = registeredIpcHandlers[
      IPC.CAMPAIGNS_GET_BY_ID
    ]({}, 404);
    expect(missingCampaignResult).toBeNull();

    const campaignAddResult = registeredIpcHandlers[IPC.CAMPAIGNS_ADD](
      {},
      { world_id: 1, name: '  New Campaign  ' },
    );
    expect(campaignsInsertRunMock).toHaveBeenCalledWith(
      1,
      'New Campaign',
      null,
      '{}',
    );
    expect(campaignsSelectByIdGetMock).toHaveBeenCalledWith(30);
    expect(campaignAddResult).toMatchObject({ id: 30 });

    expect(() =>
      registeredIpcHandlers[IPC.CAMPAIGNS_ADD](
        {},
        { world_id: 1, name: '   ' },
      ),
    ).toThrowError('Campaign name is required');

    const campaignUpdateResult = registeredIpcHandlers[IPC.CAMPAIGNS_UPDATE](
      {},
      31,
      { summary: 'A great campaign' },
    );
    const campaignUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE campaigns SET') &&
        sql.includes('summary = ?'),
    )?.[0];
    expect(campaignUpdateSql).toContain("updated_at = datetime('now')");
    expect(campaignUpdateSql).not.toContain('name = ?');
    expect(campaignsUpdateRunMock).toHaveBeenCalledWith('A great campaign', 31);
    expect(campaignUpdateResult).toMatchObject({ id: 31 });

    expect(() =>
      registeredIpcHandlers[IPC.CAMPAIGNS_UPDATE]({}, 31, { name: '   ' }),
    ).toThrowError('Campaign name cannot be empty');

    const campaignTimestampOnlyUpdateResult = registeredIpcHandlers[
      IPC.CAMPAIGNS_UPDATE
    ]({}, 32, {});
    const campaignTimestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql ===
        "UPDATE campaigns SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(campaignTimestampOnlySql).toBe(
      "UPDATE campaigns SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(campaignsUpdateRunMock).toHaveBeenLastCalledWith(32);
    expect(campaignTimestampOnlyUpdateResult).toMatchObject({ id: 32 });

    const campaignDeleteResult = registeredIpcHandlers[IPC.CAMPAIGNS_DELETE](
      {},
      33,
    );
    expect(campaignsDeleteRunMock).toHaveBeenCalledWith(33);
    expect(campaignDeleteResult).toEqual({ id: 33 });

    // BATTLEMAPS
    const battlemapsGetAllByWorldResult = registeredIpcHandlers[
      IPC.BATTLEMAPS_GET_ALL_BY_WORLD
    ]({}, 1);
    expect(battlemapsSelectAllByWorldMock).toHaveBeenCalledTimes(1);
    expect(battlemapsSelectAllByWorldMock).toHaveBeenCalledWith(1);
    expect(battlemapsGetAllByWorldResult).toEqual([
      { id: 61, world_id: 1, name: 'Dungeon Grid', config: '{}' },
    ]);

    const battlemapByIdResult = registeredIpcHandlers[IPC.BATTLEMAPS_GET_BY_ID](
      {},
      61,
    );
    expect(battlemapsSelectByIdGetMock).toHaveBeenCalledWith(61);
    expect(battlemapByIdResult).toMatchObject({ id: 61 });

    const missingBattleMapResult = registeredIpcHandlers[
      IPC.BATTLEMAPS_GET_BY_ID
    ]({}, 404);
    expect(missingBattleMapResult).toBeNull();

    const battlemapAddResult = registeredIpcHandlers[IPC.BATTLEMAPS_ADD](
      {},
      { world_id: 1, name: '  New BattleMap  ' },
    );
    const addedBattleMapConfig = JSON.parse(
      battlemapsInsertRunMock.mock.calls[0][2] as string,
    );
    expect(battlemapsInsertRunMock).toHaveBeenCalledWith(
      1,
      'New BattleMap',
      expect.any(String),
    );
    expect(addedBattleMapConfig).toEqual({
      runtime: {
        grid: {
          mode: 'square',
          cellSize: 50,
          originX: 0,
          originY: 0,
        },
        map: {
          imageSrc: null,
          backgroundColor: '#000000',
        },
        camera: {
          x: 0,
          y: 0,
          zoom: 1,
        },
      },
    });
    expect(battlemapsSelectByIdGetMock).toHaveBeenCalledWith(61);
    expect(battlemapAddResult).toMatchObject({ id: 61 });

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_ADD](
        {},
        { world_id: 1, name: '   ' },
      ),
    ).toThrowError('BattleMap name is required');

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_ADD](
        {},
        { world_id: 1, name: 'Valid', config: 'not-json' },
      ),
    ).toThrowError('BattleMap config must be valid JSON text');

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_ADD](
        {},
        {
          world_id: 1,
          name: 'Valid',
          config: 123 as unknown as string,
        },
      ),
    ).toThrowError('BattleMap config must be a JSON string');

    const battlemapUpdateResult = registeredIpcHandlers[IPC.BATTLEMAPS_UPDATE](
      {},
      61,
      { name: 'Updated BattleMap', config: '{"size":40}' },
    );
    const battlemapUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE battlemaps SET') &&
        sql.includes('name = ?') &&
        sql.includes('config = ?'),
    )?.[0];
    expect(battlemapUpdateSql).toContain("updated_at = datetime('now')");
    const updatedBattleMapConfig = JSON.parse(
      battlemapsUpdateRunMock.mock.calls[0][1] as string,
    );
    expect(battlemapsUpdateRunMock).toHaveBeenCalledWith(
      'Updated BattleMap',
      expect.any(String),
      61,
    );
    expect(updatedBattleMapConfig).toEqual({
      size: 40,
      runtime: {
        grid: {
          mode: 'square',
          cellSize: 50,
          originX: 0,
          originY: 0,
        },
        map: {
          imageSrc: null,
          backgroundColor: '#000000',
        },
        camera: {
          x: 0,
          y: 0,
          zoom: 1,
        },
      },
    });
    expect(battlemapUpdateResult).toMatchObject({ id: 61 });

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_UPDATE]({}, 61, { name: '   ' }),
    ).toThrowError('BattleMap name cannot be empty');

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_UPDATE]({}, 61, {
        config: 'not-json',
      }),
    ).toThrowError('BattleMap config must be valid JSON text');

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_UPDATE]({}, 61, {
        config: 123 as unknown as string,
      }),
    ).toThrowError('BattleMap config must be a JSON string');

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_UPDATE]({}, 404, {
        name: 'Missing BattleMap',
      }),
    ).toThrowError('BattleMap not found');

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_ADD](
        {},
        {
          world_id: 1,
          name: 'Invalid Runtime Grid Mode',
          config: '{"runtime":{"grid":{"mode":"triangle"}}}',
        },
      ),
    ).toThrowError(
      "BattleMap config runtime.grid.mode must be one of: 'square', 'hex', 'none'",
    );

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_ADD](
        {},
        {
          world_id: 1,
          name: 'Invalid Runtime Zoom',
          config: '{"runtime":{"camera":{"zoom":0}}}',
        },
      ),
    ).toThrowError(
      'BattleMap config runtime.camera.zoom must be greater than 0',
    );

    expect(() =>
      registeredIpcHandlers[IPC.BATTLEMAPS_UPDATE]({}, 61, {
        config: '{"runtime":{"map":{"backgroundColor":"   "}}}',
      }),
    ).toThrowError(
      'BattleMap config runtime.map.backgroundColor cannot be empty',
    );

    const battlemapTimestampOnlyUpdateResult = registeredIpcHandlers[
      IPC.BATTLEMAPS_UPDATE
    ]({}, 62, {});
    const battlemapTimestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql ===
        "UPDATE battlemaps SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(battlemapTimestampOnlySql).toBe(
      "UPDATE battlemaps SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(battlemapsUpdateRunMock).toHaveBeenLastCalledWith(62);
    expect(battlemapTimestampOnlyUpdateResult).toMatchObject({ id: 62 });

    const battlemapDeleteResult = registeredIpcHandlers[IPC.BATTLEMAPS_DELETE](
      {},
      63,
    );
    expect(battlemapsDeleteRunMock).toHaveBeenCalledWith(63);
    expect(battlemapDeleteResult).toEqual({ id: 63 });

    // TOKENS
    const tokensGetAllByCampaignResult = registeredIpcHandlers[
      IPC.TOKENS_GET_ALL_BY_CAMPAIGN
    ]({}, 31);
    expect(tokensSelectAllByCampaignMock).toHaveBeenCalledTimes(1);
    expect(tokensSelectAllByCampaignMock).toHaveBeenCalledWith(31);
    expect(tokensGetAllByCampaignResult).toEqual([
      {
        id: 71,
        world_id: 1,
        campaign_id: 31,
        name: 'Goblin',
        image_src: null,
        config: '{}',
        is_visible: 1,
      },
    ]);

    const tokenByIdResult = registeredIpcHandlers[IPC.TOKENS_GET_BY_ID]({}, 71);
    expect(tokensSelectByIdGetMock).toHaveBeenCalledWith(71);
    expect(tokenByIdResult).toMatchObject({ id: 71 });

    const missingTokenResult = registeredIpcHandlers[IPC.TOKENS_GET_BY_ID](
      {},
      404,
    );
    expect(missingTokenResult).toBeNull();

    const tokenAddResult = registeredIpcHandlers[IPC.TOKENS_ADD](
      {},
      {
        world_id: 1,
        campaign_id: 31,
        name: '  Orc Brute  ',
        image_src: 'orc.png',
      },
    );
    expect(tokensInsertRunMock).toHaveBeenCalledWith(
      1,
      31,
      'Orc Brute',
      'orc.png',
      '{}',
      'square',
      1,
    );
    expect(tokensSelectByIdGetMock).toHaveBeenCalledWith(71);
    expect(tokenAddResult).toMatchObject({ id: 71 });

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_ADD](
        {},
        { world_id: 1, campaign_id: 31, name: '   ' },
      ),
    ).toThrowError('Token name is required');

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_ADD](
        {},
        {
          world_id: 1,
          campaign_id: 31,
          name: 'Invalid Config',
          config: 'not-json',
        },
      ),
    ).toThrowError('Token config must be valid JSON text');

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_ADD](
        {},
        {
          world_id: 1,
          campaign_id: 31,
          name: 'Invalid Visibility',
          is_visible: 2,
        },
      ),
    ).toThrowError('Token visibility must be 0 or 1');

    const tokenUpdateResult = registeredIpcHandlers[IPC.TOKENS_UPDATE]({}, 71, {
      name: ' Updated Orc ',
      config: '{"size":"large"}',
      is_visible: 0,
    });
    const tokenUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE tokens SET') &&
        sql.includes('name = ?') &&
        sql.includes('config = ?') &&
        sql.includes('is_visible = ?'),
    )?.[0];
    expect(tokenUpdateSql).toContain("updated_at = datetime('now')");
    expect(tokensUpdateRunMock).toHaveBeenCalledWith(
      'Updated Orc',
      '{"size":"large"}',
      0,
      71,
    );
    expect(tokenUpdateResult).toMatchObject({ id: 71 });

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_UPDATE]({}, 71, { name: '   ' }),
    ).toThrowError('Token name cannot be empty');

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_UPDATE]({}, 71, {
        config: 'not-json',
      }),
    ).toThrowError('Token config must be valid JSON text');

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_UPDATE]({}, 71, {
        is_visible: 7,
      }),
    ).toThrowError('Token visibility must be 0 or 1');

    expect(() =>
      registeredIpcHandlers[IPC.TOKENS_UPDATE]({}, 404, {
        name: 'Missing token',
      }),
    ).toThrowError('Token not found');

    const tokenTimestampOnlyUpdateResult = registeredIpcHandlers[
      IPC.TOKENS_UPDATE
    ]({}, 72, {});
    const tokenTimestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql === "UPDATE tokens SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(tokenTimestampOnlySql).toBe(
      "UPDATE tokens SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(tokensUpdateRunMock).toHaveBeenLastCalledWith(72);
    expect(tokenTimestampOnlyUpdateResult).toMatchObject({ id: 72 });

    const tokenDeleteResult = registeredIpcHandlers[IPC.TOKENS_DELETE]({}, 73);
    expect(tokensDeleteRunMock).toHaveBeenCalledWith(73);
    expect(tokenDeleteResult).toEqual({ id: 73 });

    // ARCS
    const arcsGetAllByCampaignResult = registeredIpcHandlers[
      IPC.ARCS_GET_ALL_BY_CAMPAIGN
    ]({}, 1);
    expect(arcsSelectAllByCampaignMock).toHaveBeenCalledTimes(1);
    expect(arcsSelectAllByCampaignMock).toHaveBeenCalledWith(1);
    expect(arcsGetAllByCampaignResult).toEqual([
      { id: 10, campaign_id: 1, name: 'Arc One', sort_order: 0 },
    ]);

    const arcByIdResult = registeredIpcHandlers[IPC.ARCS_GET_BY_ID]({}, 10);
    expect(arcsSelectByIdGetMock).toHaveBeenCalledWith(10);
    expect(arcByIdResult).toMatchObject({ id: 10 });

    const missingArcResult = registeredIpcHandlers[IPC.ARCS_GET_BY_ID]({}, 404);
    expect(missingArcResult).toBeNull();

    const arcAddResult = registeredIpcHandlers[IPC.ARCS_ADD](
      {},
      { campaign_id: 1, name: '  New Arc  ' },
    );
    expect(arcsNextSortOrderGetMock).toHaveBeenCalledWith(1);
    expect(arcsInsertRunMock).toHaveBeenCalledWith(1, 'New Arc', 1);
    expect(arcsSelectByIdGetMock).toHaveBeenCalledWith(10);
    expect(arcAddResult).toMatchObject({ id: 10 });

    expect(() =>
      registeredIpcHandlers[IPC.ARCS_ADD]({}, { campaign_id: 1, name: '   ' }),
    ).toThrowError('Arc name is required');

    const arcUpdateResult = registeredIpcHandlers[IPC.ARCS_UPDATE]({}, 10, {
      name: 'Updated Arc',
    });
    const arcUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE arcs SET') &&
        sql.includes('name = ?'),
    )?.[0];
    expect(arcUpdateSql).toContain("updated_at = datetime('now')");
    expect(arcsUpdateRunMock).toHaveBeenCalledWith('Updated Arc', 10);
    expect(arcUpdateResult).toMatchObject({ id: 10 });

    expect(() =>
      registeredIpcHandlers[IPC.ARCS_UPDATE]({}, 10, { name: '   ' }),
    ).toThrowError('Arc name cannot be empty');

    const arcDeleteResult = registeredIpcHandlers[IPC.ARCS_DELETE]({}, 10);
    expect(arcsCampaignForDeleteGetMock).toHaveBeenCalledWith(10);
    expect(arcsDeleteRunMock).toHaveBeenCalledWith(10);
    expect(arcsSiblingIdsAllMock).toHaveBeenCalledWith(1);
    expect(arcDeleteResult).toEqual({ id: 10 });

    // ACTS
    const actsGetAllByArcResult = registeredIpcHandlers[
      IPC.ACTS_GET_ALL_BY_ARC
    ]({}, 10);
    expect(actsSelectAllByArcMock).toHaveBeenCalledTimes(1);
    expect(actsSelectAllByArcMock).toHaveBeenCalledWith(10);
    expect(actsGetAllByArcResult).toEqual([
      { id: 20, arc_id: 10, name: 'Act One', sort_order: 0 },
    ]);

    const actsGetAllByCampaignResult = registeredIpcHandlers[
      IPC.ACTS_GET_ALL_BY_CAMPAIGN
    ]({}, 1);
    expect(actsSelectAllByCampaignMock).toHaveBeenCalledTimes(1);
    expect(actsGetAllByCampaignResult).toEqual([
      { id: 20, arc_id: 10, name: 'Act One', sort_order: 0 },
    ]);

    const actByIdResult = registeredIpcHandlers[IPC.ACTS_GET_BY_ID]({}, 20);
    expect(actsSelectByIdGetMock).toHaveBeenCalledWith(20);
    expect(actByIdResult).toMatchObject({ id: 20 });

    const missingActResult = registeredIpcHandlers[IPC.ACTS_GET_BY_ID]({}, 404);
    expect(missingActResult).toBeNull();

    const actAddResult = registeredIpcHandlers[IPC.ACTS_ADD](
      {},
      { arc_id: 10, name: '  New Act  ' },
    );
    expect(actsNextSortOrderGetMock).toHaveBeenCalledWith(10);
    expect(actsInsertRunMock).toHaveBeenCalledWith(10, 'New Act', 1);
    expect(actsSelectByIdGetMock).toHaveBeenCalledWith(20);
    expect(actAddResult).toMatchObject({ id: 20 });

    expect(() =>
      registeredIpcHandlers[IPC.ACTS_ADD]({}, { arc_id: 10, name: '   ' }),
    ).toThrowError('Act name is required');

    const actUpdateResult = registeredIpcHandlers[IPC.ACTS_UPDATE]({}, 20, {
      name: 'Updated Act',
    });
    const actUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE acts SET') &&
        sql.includes('name = ?'),
    )?.[0];
    expect(actUpdateSql).toContain("updated_at = datetime('now')");
    expect(actsUpdateRunMock).toHaveBeenCalledWith('Updated Act', 20);
    expect(actUpdateResult).toMatchObject({ id: 20 });

    expect(() =>
      registeredIpcHandlers[IPC.ACTS_UPDATE]({}, 20, { name: '   ' }),
    ).toThrowError('Act name cannot be empty');

    const actDeleteResult = registeredIpcHandlers[IPC.ACTS_DELETE]({}, 20);
    expect(actsArcForDeleteGetMock).toHaveBeenCalledWith(20);
    expect(actsDeleteRunMock).toHaveBeenCalledWith(20);
    expect(actsSiblingIdsAllMock).toHaveBeenCalledWith(10);
    expect(actDeleteResult).toEqual({ id: 20 });

    // SESSIONS
    const sessionsGetAllByActResult = registeredIpcHandlers[
      IPC.SESSIONS_GET_ALL_BY_ACT
    ]({}, 20);
    expect(sessionsSelectAllByActMock).toHaveBeenCalledTimes(1);
    expect(sessionsSelectAllByActMock).toHaveBeenCalledWith(20);
    const sessionsOrderedSql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql ===
        'SELECT * FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
    )?.[0];
    expect(sessionsOrderedSql).toBe(
      'SELECT * FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
    );
    expect(sessionsGetAllByActResult).toEqual([
      { id: 41, act_id: 20, name: 'Session One', planned_at: null },
    ]);

    const sessionByIdResult = registeredIpcHandlers[IPC.SESSIONS_GET_BY_ID](
      {},
      41,
    );
    expect(sessionsSelectByIdGetMock).toHaveBeenCalledWith(41);
    expect(sessionByIdResult).toMatchObject({ id: 41 });

    const missingSessionResult = registeredIpcHandlers[IPC.SESSIONS_GET_BY_ID](
      {},
      404,
    );
    expect(missingSessionResult).toBeNull();

    const sessionAddResult = registeredIpcHandlers[IPC.SESSIONS_ADD](
      {},
      {
        act_id: 20,
        name: '  New Session  ',
        planned_at: '2026-03-15T09:30',
      },
    );
    expect(sessionsNextSortOrderGetMock).toHaveBeenCalledWith(20);
    expect(sessionsInsertRunMock).toHaveBeenCalledWith(
      20,
      'New Session',
      null,
      '2026-03-15T09:30',
      7,
    );
    expect(sessionsSelectByIdGetMock).toHaveBeenCalledWith(40);
    expect(sessionAddResult).toMatchObject({
      id: 40,
      planned_at: '2026-03-15T09:30',
    });

    expect(() =>
      registeredIpcHandlers[IPC.SESSIONS_ADD]({}, { act_id: 20, name: '   ' }),
    ).toThrowError('Session name is required');

    const sessionUpdateResult = registeredIpcHandlers[IPC.SESSIONS_UPDATE](
      {},
      41,
      {
        notes: 'Some notes',
        planned_at: '2026-03-17T10:45',
        sort_order: 3,
      },
    );
    const sessionUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE sessions SET') &&
        sql.includes('notes = ?') &&
        sql.includes('planned_at = ?') &&
        sql.includes('sort_order = ?'),
    )?.[0];
    expect(sessionUpdateSql).toContain("updated_at = datetime('now')");
    expect(sessionsUpdateRunMock).toHaveBeenCalledWith(
      'Some notes',
      '2026-03-17T10:45',
      3,
      41,
    );
    expect(sessionUpdateResult).toMatchObject({
      id: 41,
      planned_at: '2026-03-17T10:45',
    });

    expect(() =>
      registeredIpcHandlers[IPC.SESSIONS_UPDATE]({}, 41, { name: '   ' }),
    ).toThrowError('Session name cannot be empty');

    const sessionTimestampOnlyUpdateResult = registeredIpcHandlers[
      IPC.SESSIONS_UPDATE
    ]({}, 42, {});
    const sessionTimestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql === "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(sessionTimestampOnlySql).toBe(
      "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(sessionsUpdateRunMock).toHaveBeenLastCalledWith(42);
    expect(sessionTimestampOnlyUpdateResult).toMatchObject({ id: 42 });

    const sessionDeleteResult = registeredIpcHandlers[IPC.SESSIONS_DELETE](
      {},
      43,
    );
    expect(sessionsActForDeleteGetMock).toHaveBeenCalledWith(43);
    expect(sessionsDeleteRunMock).toHaveBeenCalledWith(43);
    expect(sessionsSiblingIdsAllMock).toHaveBeenCalledWith(20);
    expect(sessionsSortOrderUpdateRunMock).toHaveBeenCalledWith(0, 41);
    expect(sessionsSortOrderUpdateRunMock).toHaveBeenCalledWith(1, 42);
    expect(sessionDeleteResult).toEqual({ id: 43 });

    // SCENES
    const scenesGetAllByCampaignResult = registeredIpcHandlers[
      IPC.SCENES_GET_ALL_BY_CAMPAIGN
    ]({}, 1);
    expect(scenesSelectAllByCampaignMock).toHaveBeenCalledTimes(1);
    expect(scenesSelectAllByCampaignMock).toHaveBeenCalledWith(1);
    const campaignScenesSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('FROM scenes') &&
        sql.includes('WHERE arcs.campaign_id = ?') &&
        sql.includes('ORDER BY'),
    )?.[0];
    expect(campaignScenesSql).toContain('INNER JOIN sessions');
    expect(campaignScenesSql).toContain('INNER JOIN acts');
    expect(campaignScenesSql).toContain('INNER JOIN arcs');
    expect(scenesGetAllByCampaignResult).toEqual([
      expect.objectContaining({
        id: 51,
        session_id: 40,
        name: 'Scene One',
        session_name: 'Session One',
        act_id: 20,
        act_name: 'Act One',
        arc_id: 10,
        arc_name: 'Arc One',
      }),
    ]);

    const scenesGetAllBySessionResult = registeredIpcHandlers[
      IPC.SCENES_GET_ALL_BY_SESSION
    ]({}, 40);
    expect(scenesSelectAllBySessionMock).toHaveBeenCalledTimes(1);
    expect(scenesSelectAllBySessionMock).toHaveBeenCalledWith(40);
    const scenesOrderedSql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql ===
        'SELECT * FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
    )?.[0];
    expect(scenesOrderedSql).toBe(
      'SELECT * FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
    );
    expect(scenesGetAllBySessionResult).toEqual([
      { id: 51, session_id: 40, name: 'Scene One' },
    ]);

    const sceneByIdResult = registeredIpcHandlers[IPC.SCENES_GET_BY_ID]({}, 51);
    expect(scenesSelectByIdGetMock).toHaveBeenCalledWith(51);
    expect(sceneByIdResult).toMatchObject({ id: 51 });

    const missingSceneResult = registeredIpcHandlers[IPC.SCENES_GET_BY_ID](
      {},
      404,
    );
    expect(missingSceneResult).toBeNull();

    const sceneAddResult = registeredIpcHandlers[IPC.SCENES_ADD](
      {},
      { session_id: 40, name: '  New Scene  ' },
    );
    expect(scenesNextSortOrderGetMock).toHaveBeenCalledWith(40);
    expect(scenesInsertRunMock).toHaveBeenCalledWith(
      40,
      'New Scene',
      null,
      '{}',
      9,
    );
    expect(scenesSelectByIdGetMock).toHaveBeenCalledWith(50);
    expect(sceneAddResult).toMatchObject({ id: 50 });

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_ADD](
        {},
        { session_id: 40, name: '   ' },
      ),
    ).toThrowError('Scene name is required');

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_ADD](
        {},
        { session_id: 40, name: 'Valid', payload: 'not-json' },
      ),
    ).toThrowError('Scene payload must be valid JSON text');

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_ADD](
        {},
        {
          session_id: 40,
          name: 'Valid',
          payload: 123 as unknown as string,
        },
      ),
    ).toThrowError('Scene payload must be a JSON string');

    const sceneWithRuntimeBattleMapIdResult = registeredIpcHandlers[
      IPC.SCENES_ADD
    ](
      {},
      {
        session_id: 40,
        name: 'Runtime Scene',
        payload: '{"runtime":{"battlemap_id":61}}',
      },
    );
    expect(scenesInsertRunMock).toHaveBeenCalledWith(
      40,
      'Runtime Scene',
      null,
      '{"runtime":{"battlemap_id":61}}',
      9,
    );
    expect(sceneWithRuntimeBattleMapIdResult).toMatchObject({ id: 50 });

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_ADD](
        {},
        {
          session_id: 40,
          name: 'Invalid Runtime Payload',
          payload: '{"runtime":[]}',
        },
      ),
    ).toThrowError('Scene payload runtime must be a JSON object');

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_ADD](
        {},
        {
          session_id: 40,
          name: 'Invalid BattleMap Ref',
          payload: '{"runtime":{"battlemap_id":0}}',
        },
      ),
    ).toThrowError(
      'Scene payload runtime.battlemap_id must be a positive integer or null',
    );

    const sceneUpdateResult = registeredIpcHandlers[IPC.SCENES_UPDATE]({}, 51, {
      payload: '{"key":"value"}',
      sort_order: 1,
    });
    const sceneUpdateSql = prepareMock.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('UPDATE scenes SET') &&
        sql.includes('payload = ?') &&
        sql.includes('sort_order = ?'),
    )?.[0];
    expect(sceneUpdateSql).toContain("updated_at = datetime('now')");
    expect(scenesUpdateRunMock).toHaveBeenCalledWith('{"key":"value"}', 1, 51);
    expect(sceneUpdateResult).toMatchObject({ id: 51 });

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_UPDATE]({}, 51, { name: '   ' }),
    ).toThrowError('Scene name cannot be empty');

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_UPDATE]({}, 51, { payload: 'not-json' }),
    ).toThrowError('Scene payload must be valid JSON text');

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_UPDATE]({}, 51, {
        payload: '{"runtime":{"battlemap_id":-1}}',
      }),
    ).toThrowError(
      'Scene payload runtime.battlemap_id must be a positive integer or null',
    );

    const sceneTimestampOnlyUpdateResult = registeredIpcHandlers[
      IPC.SCENES_UPDATE
    ]({}, 52, {});
    const sceneTimestampOnlySql = prepareMock.mock.calls.find(
      ([sql]) =>
        sql === "UPDATE scenes SET updated_at = datetime('now') WHERE id = ?",
    )?.[0];
    expect(sceneTimestampOnlySql).toBe(
      "UPDATE scenes SET updated_at = datetime('now') WHERE id = ?",
    );
    expect(scenesUpdateRunMock).toHaveBeenLastCalledWith(52);
    expect(sceneTimestampOnlyUpdateResult).toMatchObject({ id: 52 });

    const sceneDeleteResult = registeredIpcHandlers[IPC.SCENES_DELETE]({}, 53);
    expect(scenesSessionForDeleteGetMock).toHaveBeenCalledWith(53);
    expect(scenesDeleteRunMock).toHaveBeenCalledWith(53);
    expect(scenesSiblingIdsAllMock).toHaveBeenCalledWith(40);
    expect(scenesSortOrderUpdateRunMock).toHaveBeenCalledWith(0, 51);
    expect(scenesSortOrderUpdateRunMock).toHaveBeenCalledWith(1, 52);
    expect(sceneDeleteResult).toEqual({ id: 53 });

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_MOVE_TO_SESSION]({}, 404, 41),
    ).toThrowError('Scene not found');

    expect(() =>
      registeredIpcHandlers[IPC.SCENES_MOVE_TO_SESSION]({}, 51, 404),
    ).toThrowError('Target session not found');

    scenesMoveNextSortOrderGetMock.mockClear();
    scenesUpdateRunMock.mockClear();
    scenesSiblingIdsAllMock.mockClear();
    scenesSortOrderUpdateRunMock.mockClear();

    const noOpMoveResult = registeredIpcHandlers[IPC.SCENES_MOVE_TO_SESSION](
      {},
      51,
      40,
    );
    expect(noOpMoveResult).toMatchObject({ id: 51, session_id: 40 });
    expect(scenesMoveNextSortOrderGetMock).not.toHaveBeenCalled();
    expect(scenesUpdateRunMock).not.toHaveBeenCalled();
    expect(scenesSiblingIdsAllMock).not.toHaveBeenCalled();
    expect(scenesSortOrderUpdateRunMock).not.toHaveBeenCalled();

    scenesMoveNextSortOrderGetMock.mockClear();
    scenesMoveNextSortOrderGetMock.mockReturnValueOnce({ nextSortOrder: 6 });
    scenesUpdateRunMock.mockClear();
    scenesSiblingIdsAllMock.mockClear();
    scenesSortOrderUpdateRunMock.mockClear();
    scenesSelectByIdGetMock
      .mockImplementationOnce((id: number) => ({
        id,
        session_id: 40,
        name: `Scene ${id}`,
        notes: null,
        payload: '{}',
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      }))
      .mockImplementationOnce((id: number) => ({
        id,
        session_id: 41,
        name: `Scene ${id}`,
        notes: null,
        payload: '{}',
        sort_order: 6,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      }));

    const moveSceneResult = registeredIpcHandlers[IPC.SCENES_MOVE_TO_SESSION](
      {},
      51,
      41,
    );
    expect(sessionsSelectByIdGetMock).toHaveBeenCalledWith(41);
    expect(scenesMoveNextSortOrderGetMock).toHaveBeenCalledWith(41);
    expect(scenesUpdateRunMock).toHaveBeenCalledWith(41, 6, 51);
    expect(scenesSiblingIdsAllMock).toHaveBeenCalledWith(40);
    expect(scenesSortOrderUpdateRunMock).toHaveBeenCalledWith(0, 51);
    expect(scenesSortOrderUpdateRunMock).toHaveBeenCalledWith(1, 52);
    expect(moveSceneResult).toMatchObject({ id: 51, session_id: 41 });

    // STATBLOCKS
    const statblocksGetAllByWorldResult = registeredIpcHandlers[
      IPC.STATBLOCKS_GET_ALL_BY_WORLD
    ]({}, 1);
    expect(statblocksSelectAllByWorldMock).toHaveBeenCalledTimes(1);
    expect(statblocksSelectAllByWorldMock).toHaveBeenCalledWith(1);
    expect(statblocksGetAllByWorldResult).toEqual([
      { id: 91, world_id: 1, name: 'Goblin Warrior', config: '{}' },
    ]);

    const statblocksGetAllByCampaignResult = registeredIpcHandlers[
      IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN
    ]({}, 31);
    expect(statblocksSelectAllByCampaignMock).toHaveBeenCalledTimes(1);
    expect(statblocksSelectAllByCampaignMock).toHaveBeenCalledWith(31);
    expect(statblocksGetAllByCampaignResult).toEqual([
      { id: 92, world_id: 1, campaign_id: 31, name: 'Orc Shaman', config: '{}' },
    ]);

    const statblockByIdResult = registeredIpcHandlers[
      IPC.STATBLOCKS_GET_BY_ID
    ]({}, 91);
    expect(statblocksSelectByIdGetMock).toHaveBeenCalledWith(91);
    expect(statblockByIdResult).toMatchObject({ id: 91 });

    const missingStatblockResult = registeredIpcHandlers[
      IPC.STATBLOCKS_GET_BY_ID
    ]({}, 404);
    expect(missingStatblockResult).toBeNull();

    registeredEvents['before-quit']();
    expect(closeDatabaseMock).toHaveBeenCalledTimes(1);

    getAllWindowsMock.mockReturnValueOnce([]).mockReturnValueOnce([{}]);
    registeredEvents.activate();
    registeredEvents.activate();
    expect(browserWindowCtorMock).toHaveBeenCalledTimes(2);

    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    registeredEvents['window-all-closed']();
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    registeredEvents['window-all-closed']();
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    setForgeGlobals(undefined);
    await registeredEvents.ready();
    expect(loadFileMock).toHaveBeenCalledTimes(1);
  });
});
