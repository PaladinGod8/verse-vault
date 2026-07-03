import { beforeEach, describe, expect, it, vi } from 'vitest';

type EventHandler = (...args: unknown[]) => unknown;
type ProtocolHandler = (request: { url: string; }) => Promise<Response>;

const registeredEvents: Record<string, EventHandler> = {};
const registeredProtocols: Record<string, ProtocolHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
const dialogShowMessageBoxMock = vi.fn();
const dialogShowSaveDialogMock = vi.fn();
const appGetAppPathMock = vi.fn(() => 'C:\\repo-root');
const appGetPathMock = vi.fn((name: string) => {
  if (name === 'userData') {
    return 'C:\\mock-user-data';
  }
  if (name === 'downloads') {
    return 'C:\\mock-downloads';
  }
  return 'C:\\other-path';
});
const protocolHandleMock = vi.fn((name: string, handler: ProtocolHandler) => {
  registeredProtocols[name] = handler;
});
const protocolRegisterSchemesAsPrivilegedMock = vi.fn();
const netFetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
const loadURLMock = vi.fn();
const loadFileMock = vi.fn();
const openDevToolsMock = vi.fn();
const browserWindowOnceMock = vi.fn((_event: string, handler: () => void) => {
  handler();
});
const browserWindowShowMock = vi.fn();
const getAllWindowsMock = vi.fn(() => []);
const browserWindowCtorMock = vi.fn();

class BrowserWindowMock {
  loadURL = loadURLMock;
  loadFile = loadFileMock;
  once = browserWindowOnceMock;
  show = browserWindowShowMock;
  webContents = {
    openDevTools: openDevToolsMock,
  };

  constructor(options: Record<string, unknown>) {
    browserWindowCtorMock(options);
  }

  static getAllWindows = getAllWindowsMock;
}

const getDatabaseMock = vi.fn(() => ({ id: 'db-mock' }));
const closeDatabaseMock = vi.fn();

const registerVerseHandlersMock = vi.fn();
const registerWorldHandlersMock = vi.fn();
const registerLevelHandlersMock = vi.fn();
const registerCampaignHandlersMock = vi.fn();
const registerCampaignNoteHandlersMock = vi.fn();
const registerBattleMapHandlersMock = vi.fn();
const registerTokenHandlersMock = vi.fn();
const registerArcHandlersMock = vi.fn();
const registerActHandlersMock = vi.fn();
const registerSessionHandlersMock = vi.fn();
const registerSceneHandlersMock = vi.fn();
const registerAbilityHandlersMock = vi.fn();
const registerStatBlockHandlersMock = vi.fn();
const registerCharacterHandlersMock = vi.fn();
const registerBackgroundHandlersMock = vi.fn();
const registerItemHandlersMock = vi.fn();
const registerLoreNoteHandlersMock = vi.fn();
const registerFactionHandlersMock = vi.fn();
const registerFactionTypeHandlersMock = vi.fn();
const registerFactionMemberHandlersMock = vi.fn();
const registerSettingsHandlersMock = vi.fn();
const registerWorldMapHandlersMock = vi.fn();
const registerWorldMapHostHandlersMock = vi.fn();
const createWorldMapsRepoMock = vi.fn(() => ({ getByWorld: vi.fn(() => null) }));
const createWorldMapSnapshotStoreMock = vi.fn(() => ({ deleteSnapshot: vi.fn() }));
const createWorldMapPersistenceMock = vi.fn(() => ({
  getByWorld: vi.fn(() => null),
  deleteByWorld: vi.fn(async () => undefined),
  saveSnapshot: vi.fn(),
}));
const createWorldMapEditorManagerMock = vi.fn(() => ({
  openWorldMapEditor: vi.fn(async () => ({ opened: true as const, worldMapId: null })),
  resolveWorldId: vi.fn(() => null),
  buildSession: vi.fn(),
  saveWorldMapSnapshot: vi.fn(),
  regenerateWorldMap: vi.fn(async () => ({ ok: true as const })),
  exportWorldMapCopy: vi.fn(async () => ({ ok: true as const })),
  closeWorldMapWindow: vi.fn(async () => ({ ok: true as const })),
}));
const createWorldMapProtocolHandlerMock = vi.fn(() => ({
  urls: {
    hostPageUrl: 'vv-fmg://app/index.html',
    vendorEntryUrl: 'vv-fmg://app/vendor/index.html',
    mapFileUrl: (storageKey: string) => `vv-fmg://app/maps/${storageKey}`,
  },
  handle: vi.fn(async () => new Response('world-map-protocol', { status: 200 })),
}));

vi.mock('electron-squirrel-startup', () => false);
vi.mock('electron', () => ({
  app: {
    on: appOnMock,
    quit: appQuitMock,
    getAppPath: appGetAppPathMock,
    getPath: appGetPathMock,
  },
  BrowserWindow: BrowserWindowMock,
  protocol: {
    handle: protocolHandleMock,
    registerSchemesAsPrivileged: protocolRegisterSchemesAsPrivilegedMock,
  },
  net: {
    fetch: netFetchMock,
  },
  dialog: {
    showMessageBox: dialogShowMessageBoxMock,
    showSaveDialog: dialogShowSaveDialogMock,
  },
  ipcMain: {
    handle: vi.fn(),
  },
}));
vi.mock('../../src/database/db', () => ({
  getDatabase: getDatabaseMock,
  closeDatabase: closeDatabaseMock,
}));
vi.mock('../../src/main/ipc/registerVerseHandlers', () => ({
  registerVerseHandlers: registerVerseHandlersMock,
}));
vi.mock('../../src/main/ipc/registerWorldHandlers', () => ({
  registerWorldHandlers: registerWorldHandlersMock,
}));
vi.mock('../../src/main/ipc/registerLevelHandlers', () => ({
  registerLevelHandlers: registerLevelHandlersMock,
}));
vi.mock('../../src/main/ipc/registerCampaignHandlers', () => ({
  registerCampaignHandlers: registerCampaignHandlersMock,
}));
vi.mock('../../src/main/ipc/registerCampaignNoteHandlers', () => ({
  registerCampaignNoteHandlers: registerCampaignNoteHandlersMock,
}));
vi.mock('../../src/main/ipc/registerBattleMapHandlers', () => ({
  registerBattleMapHandlers: registerBattleMapHandlersMock,
}));
vi.mock('../../src/main/ipc/registerTokenHandlers', () => ({
  registerTokenHandlers: registerTokenHandlersMock,
}));
vi.mock('../../src/main/ipc/registerArcHandlers', () => ({
  registerArcHandlers: registerArcHandlersMock,
}));
vi.mock('../../src/main/ipc/registerActHandlers', () => ({
  registerActHandlers: registerActHandlersMock,
}));
vi.mock('../../src/main/ipc/registerSessionHandlers', () => ({
  registerSessionHandlers: registerSessionHandlersMock,
}));
vi.mock('../../src/main/ipc/registerSceneHandlers', () => ({
  registerSceneHandlers: registerSceneHandlersMock,
}));
vi.mock('../../src/main/ipc/registerAbilityHandlers', () => ({
  registerAbilityHandlers: registerAbilityHandlersMock,
}));
vi.mock('../../src/main/ipc/registerStatBlockHandlers', () => ({
  registerStatBlockHandlers: registerStatBlockHandlersMock,
}));
vi.mock('../../src/main/ipc/registerCharacterHandlers', () => ({
  registerCharacterHandlers: registerCharacterHandlersMock,
}));
vi.mock('../../src/main/ipc/registerBackgroundHandlers', () => ({
  registerBackgroundHandlers: registerBackgroundHandlersMock,
}));
vi.mock('../../src/main/ipc/registerItemHandlers', () => ({
  registerItemHandlers: registerItemHandlersMock,
}));
vi.mock('../../src/main/ipc/registerLoreNoteHandlers', () => ({
  registerLoreNoteHandlers: registerLoreNoteHandlersMock,
}));
vi.mock('../../src/main/ipc/registerFactionHandlers', () => ({
  registerFactionHandlers: registerFactionHandlersMock,
}));
vi.mock('../../src/main/ipc/registerFactionTypeHandlers', () => ({
  registerFactionTypeHandlers: registerFactionTypeHandlersMock,
}));
vi.mock('../../src/main/ipc/registerFactionMemberHandlers', () => ({
  registerFactionMemberHandlers: registerFactionMemberHandlersMock,
}));
vi.mock('../../src/main/ipc/registerSettingsHandlers', () => ({
  registerSettingsHandlers: registerSettingsHandlersMock,
}));
vi.mock('../../src/main/ipc/registerWorldMapHandlers', () => ({
  registerWorldMapHandlers: registerWorldMapHandlersMock,
}));
vi.mock('../../src/main/ipc/registerWorldMapHostHandlers', () => ({
  registerWorldMapHostHandlers: registerWorldMapHostHandlersMock,
}));
vi.mock('../../src/database/repos/worldMapsRepo', () => ({
  createWorldMapsRepo: createWorldMapsRepoMock,
}));
vi.mock('../../src/main/worldMapSnapshotStore', () => ({
  createWorldMapSnapshotStore: createWorldMapSnapshotStoreMock,
}));
vi.mock('../../src/main/worldMapPersistence', () => ({
  createWorldMapPersistence: createWorldMapPersistenceMock,
}));
vi.mock('../../src/main/worldMapEditorManager', () => ({
  createWorldMapEditorManager: createWorldMapEditorManagerMock,
}));
vi.mock('../../src/main/worldMapProtocol', () => ({
  WORLD_MAP_PROTOCOL: 'vv-fmg',
  createWorldMapProtocolHandler: createWorldMapProtocolHandlerMock,
}));

function setForgeGlobals(devServerUrl: string | undefined): void {
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

async function importMainWithMocks(): Promise<void> {
  vi.resetModules();
  await import('../../src/main');
}

describe('main bootstrap orchestration', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(registeredEvents)) delete registeredEvents[key];
    for (const key of Object.keys(registeredProtocols)) delete registeredProtocols[key];
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('registers lifecycle events, delegates to registrars, and creates the window', async () => {
    setForgeGlobals(undefined);
    await importMainWithMocks();

    expect(registeredEvents.ready).toBeDefined();
    expect(registeredEvents['before-quit']).toBeDefined();
    expect(registeredEvents['window-all-closed']).toBeDefined();
    expect(registeredEvents.activate).toBeDefined();

    await registeredEvents.ready();

    const dbMock = getDatabaseMock.mock.results[0]?.value;
    expect(registerVerseHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerWorldHandlersMock).toHaveBeenCalledWith(
      dbMock,
      expect.objectContaining({
        cleanupDeletedWorld: expect.any(Function),
      }),
    );
    expect(registerLevelHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerCampaignHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerCampaignNoteHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerBattleMapHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerTokenHandlersMock).toHaveBeenCalledWith(dbMock, {
      userDataPath: 'C:\\mock-user-data',
    });
    expect(registerArcHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerActHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerSessionHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerSceneHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerAbilityHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerStatBlockHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerCharacterHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerBackgroundHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerItemHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerLoreNoteHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerFactionHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerFactionTypeHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerFactionMemberHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerSettingsHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerWorldMapHandlersMock).toHaveBeenCalledWith(
      dbMock,
      expect.objectContaining({
        openEditor: expect.any(Function),
      }),
    );
    expect(registerWorldMapHostHandlersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resolveWorldId: expect.any(Function),
        buildSession: expect.any(Function),
        saveCurrent: expect.any(Function),
        regenerate: expect.any(Function),
        exportCopy: expect.any(Function),
        closeWindow: expect.any(Function),
      }),
    );

    expect(browserWindowCtorMock).toHaveBeenCalledTimes(1);
    expect(loadFileMock).toHaveBeenCalledTimes(1);
  });

  it('handles protocol and app lifecycle side effects', async () => {
    setForgeGlobals(undefined);
    await importMainWithMocks();
    await registeredEvents.ready();

    expect(protocolHandleMock).toHaveBeenCalledWith('vv-media', expect.any(Function));
    expect(protocolRegisterSchemesAsPrivilegedMock).toHaveBeenCalled();
    expect(protocolHandleMock).toHaveBeenCalledWith('vv-fmg', expect.any(Function));
    const protocolHandler = registeredProtocols['vv-media'];
    expect(protocolHandler).toBeDefined();

    const tokenResponse = await protocolHandler({
      url: 'vv-media://token-images/token.png',
    });
    expect(tokenResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/token-images/token.png'),
    );

    const worldResponse = await protocolHandler({
      url: 'vv-media://world-images/world.png',
    });
    expect(worldResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/world-images/world.png'),
    );

    const characterResponse = await protocolHandler({
      url: 'vv-media://character-images/character.png',
    });
    expect(characterResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/character-images/character.png'),
    );

    const factionResponse = await protocolHandler({
      url: 'vv-media://faction-images/faction.png',
    });
    expect(factionResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/faction-images/faction.png'),
    );

    const backgroundResponse = await protocolHandler({
      url: 'vv-media://background-images/background.png',
    });
    expect(backgroundResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/background-images/background.png'),
    );

    const itemResponse = await protocolHandler({
      url: 'vv-media://item-images/item.png',
    });
    expect(itemResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/item-images/item.png'),
    );

    const loreNoteResponse = await protocolHandler({
      url: 'vv-media://lore-note-images/note.png',
    });
    expect(loreNoteResponse.status).toBe(200);
    expect(netFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/lore-note-images/note.png'),
    );

    const unknownHostResponse = await protocolHandler({
      url: 'vv-media://bad-host/world.png',
    });
    expect(unknownHostResponse.status).toBe(404);

    const invalidPathResponse = await protocolHandler({
      url: 'vv-media://token-images/nested/path.png',
    });
    expect(invalidPathResponse.status).toBe(400);

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
  });
});
