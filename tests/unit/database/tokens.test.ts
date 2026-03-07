import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../../src/shared/ipcChannels';

type EventHandler = (...args: unknown[]) => unknown;
type IpcHandler = (...args: unknown[]) => unknown;

const registeredEvents: Record<string, EventHandler> = {};
const registeredIpcHandlers: Record<string, IpcHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
const appGetPathMock = vi.fn(() => 'C:\\mock-user-data');
const protocolHandleMock = vi.fn();
const netFetchMock = vi.fn();
const ipcHandleMock = vi.fn((channel: string, handler: IpcHandler) => {
  registeredIpcHandlers[channel] = handler;
});
const loadURLMock = vi.fn();
const loadFileMock = vi.fn();
const openDevToolsMock = vi.fn();
const getAllWindowsMock = vi.fn(() => []);
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
  (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
);
const getDatabaseMock = vi.fn(() => ({
  prepare: prepareMock,
  transaction: transactionMock,
}));
const closeDatabaseMock = vi.fn();
const randomUUIDMock = vi.fn(() => 'mock-uuid');
const mkdirMock = vi.fn(async () => undefined);
const writeFileMock = vi.fn(async () => undefined);
const pathToFileURLMock = vi.fn((value: string) => ({
  toString: () => `file:///${value.replaceAll('\\', '/')}`,
}));

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
  vi.clearAllMocks();

  for (const key of Object.keys(registeredEvents)) delete registeredEvents[key];
  for (const key of Object.keys(registeredIpcHandlers)) {
    delete registeredIpcHandlers[key];
  }

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
    __esModule: true,
    randomUUID: randomUUIDMock,
    default: {
      randomUUID: randomUUIDMock,
    },
  }));
  vi.doMock('node:fs/promises', () => ({
    __esModule: true,
    mkdir: mkdirMock,
    writeFile: writeFileMock,
    default: {
      mkdir: mkdirMock,
      writeFile: writeFileMock,
    },
  }));
  vi.doMock('node:url', () => ({
    __esModule: true,
    pathToFileURL: pathToFileURLMock,
    default: {
      pathToFileURL: pathToFileURLMock,
    },
  }));
  vi.doMock('../../../src/database/db', () => ({
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

  await import('../../../src/main');
  await registeredEvents.ready();
}

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    world_id: 1,
    campaign_id: null,
    name: 'Wolf',
    image_src: null,
    config: '{}',
    grid_type: 'square',
    is_visible: 1,
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function setupTokenSqlMocks(initialTokens: Token[]) {
  const tokenRows = new Map<number, Token>(
    initialTokens.map((token) => [token.id, { ...token }]),
  );
  let nextTokenId = Math.max(0, ...initialTokens.map((token) => token.id)) + 1;
  let lastTokenUpdateSql = '';

  const tokensGetAllByWorldMock = vi.fn((worldId: number) =>
    [...tokenRows.values()]
      .filter((token) => token.world_id === worldId)
      .sort((left, right) => left.name.localeCompare(right.name))
  );
  const tokensGetByIdMock = vi.fn((id: number) => tokenRows.get(id));
  const tokensInsertRunMock = vi.fn(
    (
      worldId: number,
      campaignId: number | null,
      name: string,
      imageSrc: string | null,
      config: string,
      gridType: TokenGridType,
      isVisible: number,
    ) => {
      const id = nextTokenId++;
      tokenRows.set(
        id,
        buildToken({
          id,
          world_id: worldId,
          campaign_id: campaignId,
          name,
          image_src: imageSrc,
          config,
          grid_type: gridType,
          is_visible: isVisible,
        }),
      );
      return { lastInsertRowid: id };
    },
  );
  const tokensUpdateRunMock = vi.fn(
    (...args: Array<string | number | null | undefined>) => {
      const id = args[args.length - 1];
      if (typeof id !== 'number') return;
      const existing = tokenRows.get(id);
      if (!existing) return;

      let valueIndex = 0;
      if (lastTokenUpdateSql.includes('name = ?')) {
        existing.name = String(args[valueIndex] ?? '');
        valueIndex += 1;
      }
      if (lastTokenUpdateSql.includes('image_src = ?')) {
        existing.image_src = (args[valueIndex] as string | null) ?? null;
        valueIndex += 1;
      }
      if (lastTokenUpdateSql.includes('config = ?')) {
        existing.config = String(args[valueIndex] ?? '{}');
        valueIndex += 1;
      }
      if (lastTokenUpdateSql.includes('grid_type = ?')) {
        existing.grid_type = String(
          args[valueIndex] ?? 'square',
        ) as TokenGridType;
        valueIndex += 1;
      }
      if (lastTokenUpdateSql.includes('is_visible = ?')) {
        existing.is_visible = Number(args[valueIndex] ?? 1);
      }
      existing.updated_at = '2026-03-04 00:00:00';
      tokenRows.set(id, existing);
    },
  );
  const tokensDeleteRunMock = vi.fn((id: number) => {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid id');
    }
    tokenRows.delete(id);
  });

  prepareMock.mockImplementation((sql: string) => {
    if (sql === 'SELECT * FROM tokens WHERE id = ?') {
      return { get: tokensGetByIdMock };
    }
    if (sql === 'SELECT * FROM tokens WHERE world_id = ? ORDER BY name ASC') {
      return { all: tokensGetAllByWorldMock };
    }
    if (
      sql
        === 'INSERT INTO tokens (world_id, campaign_id, name, image_src, config, grid_type, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ) {
      return { run: tokensInsertRunMock };
    }
    if (sql.startsWith('UPDATE tokens SET')) {
      lastTokenUpdateSql = sql;
      return { run: tokensUpdateRunMock };
    }
    if (sql === 'DELETE FROM tokens WHERE id = ?') {
      return { run: tokensDeleteRunMock };
    }

    return {
      all: vi.fn(() => []),
      get: vi.fn(() => undefined),
      run: vi.fn(() => ({ lastInsertRowid: 0 })),
    };
  });

  return {
    tokensGetAllByWorldMock,
    tokensInsertRunMock,
    tokensUpdateRunMock,
    tokensDeleteRunMock,
    getLastTokenUpdateSql: () => lastTokenUpdateSql,
  };
}

describe('token IPC handlers', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    appGetPathMock.mockReset();
    appGetPathMock.mockReturnValue('C:\\mock-user-data');
    protocolHandleMock.mockReset();
    netFetchMock.mockReset();
    randomUUIDMock.mockReset();
    randomUUIDMock.mockReturnValue('mock-uuid');
    mkdirMock.mockReset();
    writeFileMock.mockReset();
    pathToFileURLMock.mockReset();
    pathToFileURLMock.mockImplementation((value: string) => ({
      toString: () => `file:///${value.replaceAll('\\', '/')}`,
    }));
    setForgeGlobals(undefined);
  });

  it('handles TOKENS_GET_ALL_BY_WORLD with valid, invalid, and empty world ids', async () => {
    const tokenOne = buildToken({ id: 11, world_id: 1, name: 'Alpha' });
    const tokenTwo = buildToken({
      id: 12,
      world_id: 1,
      campaign_id: 42,
      name: 'Beta',
    });
    const tokenThree = buildToken({ id: 13, world_id: 2, name: 'Gamma' });
    const { tokensGetAllByWorldMock } = setupTokenSqlMocks([
      tokenOne,
      tokenTwo,
      tokenThree,
    ]);

    await importMainWithMocks();

    const handler = registeredIpcHandlers[IPC.TOKENS_GET_ALL_BY_WORLD];
    expect(handler).toBeTypeOf('function');

    const worldOneTokens = handler({}, 1) as Token[];
    expect(tokensGetAllByWorldMock).toHaveBeenCalledWith(1);
    expect(worldOneTokens).toHaveLength(2);
    expect(worldOneTokens.map((token) => token.id)).toEqual([11, 12]);
    expect(worldOneTokens.some((token) => token.campaign_id === null)).toBe(
      true,
    );
    expect(worldOneTokens.some((token) => token.campaign_id === 42)).toBe(true);

    expect(handler({}, 9)).toEqual([]);
    expect(() => handler({}, 0)).toThrowError('Invalid worldId');
    expect(() => handler({}, -1)).toThrowError('Invalid worldId');
    expect(() => handler({}, 1.2)).toThrowError('Invalid worldId');
  });

  it('handles TOKENS_ADD for world and campaign scopes with validation/defaults', async () => {
    const { tokensInsertRunMock } = setupTokenSqlMocks([]);

    await importMainWithMocks();

    const handler = registeredIpcHandlers[IPC.TOKENS_ADD];
    expect(handler).toBeTypeOf('function');

    const worldScopedResult = handler({}, { world_id: 1, name: '  Wolf  ' });
    expect(tokensInsertRunMock).toHaveBeenNthCalledWith(
      1,
      1,
      null,
      'Wolf',
      null,
      '{}',
      'square',
      1,
    );
    expect(worldScopedResult).toMatchObject({
      world_id: 1,
      campaign_id: null,
      name: 'Wolf',
      image_src: null,
      config: '{}',
      is_visible: 1,
    });

    const campaignScopedResult = handler(
      {},
      {
        world_id: 1,
        campaign_id: 7,
        name: '  Guard  ',
        image_src: 'https://assets.example/guard.png',
        config: '{"size":"large"}',
        is_visible: 0,
      },
    );
    expect(tokensInsertRunMock).toHaveBeenNthCalledWith(
      2,
      1,
      7,
      'Guard',
      'https://assets.example/guard.png',
      '{"size":"large"}',
      'square',
      0,
    );
    expect(campaignScopedResult).toMatchObject({
      world_id: 1,
      campaign_id: 7,
      name: 'Guard',
      image_src: 'https://assets.example/guard.png',
      config: '{"size":"large"}',
      is_visible: 0,
    });

    expect(() => handler({}, { name: 'Missing world id' })).toThrowError(
      'Invalid world_id',
    );
    expect(() => handler({}, { world_id: 0, name: 'Bad world' })).toThrowError(
      'Invalid world_id',
    );
    expect(() => handler({}, { world_id: 1, campaign_id: 0, name: 'Bad campaign' })).toThrowError(
      'Invalid campaign_id',
    );
    expect(() => handler({}, { world_id: 1, name: '   ' })).toThrowError(
      'Token name is required',
    );
  });

  it('handles TOKENS_UPDATE field updates without changing world/campaign ids', async () => {
    const startingToken = buildToken({
      id: 21,
      world_id: 8,
      campaign_id: 12,
      name: 'Old Name',
      image_src: 'https://assets.example/old.png',
      config: '{"size":"medium"}',
      is_visible: 1,
    });
    const { tokensUpdateRunMock, getLastTokenUpdateSql } = setupTokenSqlMocks([
      startingToken,
    ]);

    await importMainWithMocks();

    const handler = registeredIpcHandlers[IPC.TOKENS_UPDATE];
    expect(handler).toBeTypeOf('function');

    const nameUpdated = handler({}, 21, { name: '  New Name  ' }) as Token;
    expect(getLastTokenUpdateSql()).toContain('name = ?');
    expect(getLastTokenUpdateSql()).not.toContain('world_id');
    expect(getLastTokenUpdateSql()).not.toContain('campaign_id');
    expect(tokensUpdateRunMock).toHaveBeenLastCalledWith('New Name', 21);
    expect(nameUpdated.world_id).toBe(8);
    expect(nameUpdated.campaign_id).toBe(12);

    handler({}, 21, { image_src: null });
    expect(getLastTokenUpdateSql()).toContain('image_src = ?');
    expect(tokensUpdateRunMock).toHaveBeenLastCalledWith(null, 21);

    handler({}, 21, { config: '{"shape":"hex"}' });
    expect(getLastTokenUpdateSql()).toContain('config = ?');
    expect(tokensUpdateRunMock).toHaveBeenLastCalledWith('{"shape":"hex"}', 21);

    handler({}, 21, { is_visible: 0 });
    expect(getLastTokenUpdateSql()).toContain('is_visible = ?');
    expect(tokensUpdateRunMock).toHaveBeenLastCalledWith(0, 21);

    expect(() => handler({}, 21, { name: '   ' })).toThrowError(
      'Token name cannot be empty',
    );
    expect(() => handler({}, 999, { name: 'Missing token' })).toThrowError(
      'Token not found',
    );
  });

  it('handles TOKENS_DELETE success and invalid id failure', async () => {
    const token = buildToken({ id: 31 });
    const { tokensDeleteRunMock } = setupTokenSqlMocks([token]);

    await importMainWithMocks();

    const handler = registeredIpcHandlers[IPC.TOKENS_DELETE];
    expect(handler).toBeTypeOf('function');

    expect(handler({}, 31)).toEqual({ id: 31 });
    expect(tokensDeleteRunMock).toHaveBeenCalledWith(31);
    expect(() => handler({}, 0)).toThrowError('Invalid id');
  });

  it('handles TOKENS_IMPORT_IMAGE validation and success paths', async () => {
    setupTokenSqlMocks([]);

    await importMainWithMocks();

    const handler = registeredIpcHandlers[IPC.TOKENS_IMPORT_IMAGE];
    expect(handler).toBeTypeOf('function');

    const validBytes = new Uint8Array([1, 2, 3, 4]);
    const importResult = (await handler(
      {},
      {
        fileName: 'wolf.png',
        mimeType: 'image/png',
        bytes: validBytes,
      },
    )) as TokenImageImportResult;

    expect(appGetPathMock).toHaveBeenCalledWith('userData');
    expect(mkdirMock).toHaveBeenCalledWith(
      'C:\\mock-user-data\\token-images',
      expect.objectContaining({ recursive: true }),
    );
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [savedPath, savedBytes] = writeFileMock.mock.calls[0] as unknown as [
      string,
      Uint8Array,
    ];
    expect(savedPath).toContain('C:\\mock-user-data\\token-images\\');
    expect(savedPath.endsWith('-mock-uuid.png')).toBe(true);
    expect(savedBytes).toBe(validBytes);
    expect(importResult.image_src).toMatch(
      /^vv-media:\/\/token-images\/\d+-mock-uuid\.png$/i,
    );

    await expect(
      handler(
        {},
        {
          fileName: 'wolf.txt',
          mimeType: 'text/plain',
          bytes: new Uint8Array([1]),
        },
      ),
    ).rejects.toThrowError('Unsupported token image mimeType');

    await expect(
      handler(
        {},
        {
          fileName: 'wolf.png',
          mimeType: 'image/png',
          bytes: new Uint8Array(0),
        },
      ),
    ).rejects.toThrowError('Token image bytes cannot be empty');

    await expect(
      handler(
        {},
        {
          fileName: 'wolf.png',
          mimeType: 'image/png',
          bytes: new Uint8Array(5 * 1024 * 1024 + 1),
        },
      ),
    ).rejects.toThrowError('Token image exceeds 5 MB limit');
  });
});
