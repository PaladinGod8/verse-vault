import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../src/shared/ipcChannels';

type EventHandler = (...args: unknown[]) => unknown;
type IpcHandler = (...args: unknown[]) => unknown;

const registeredEvents: Record<string, EventHandler> = {};
const registeredIpcHandlers: Record<string, IpcHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
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
const getDatabaseMock = vi.fn(() => ({
  prepare: prepareMock,
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

  vi.clearAllMocks();

  vi.doMock('electron-squirrel-startup', () => false);
  vi.doMock('electron', () => ({
    app: {
      on: appOnMock,
      quit: appQuitMock,
    },
    BrowserWindow: BrowserWindowMock,
    ipcMain: {
      handle: ipcHandleMock,
    },
  }));
  vi.doMock('../../src/database/db', () => ({
    getDatabase: getDatabaseMock,
    closeDatabase: closeDatabaseMock,
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

    registeredEvents.ready();

    expect(getDatabaseMock).toHaveBeenCalledTimes(1);
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

    expect(ipcHandleMock).toHaveBeenCalledTimes(23);

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
    registeredEvents.ready();
    expect(loadFileMock).toHaveBeenCalledTimes(1);
  });
});
