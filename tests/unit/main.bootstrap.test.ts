import { beforeEach, describe, expect, it, vi } from 'vitest';

type EventHandler = (...args: unknown[]) => unknown;
type ProtocolHandler = (request: { url: string; }) => Promise<Response>;

const registeredEvents: Record<string, EventHandler> = {};
const registeredProtocols: Record<string, ProtocolHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
const appGetPathMock = vi.fn((name: string) => {
  if (name === 'userData') {
    return 'C:\\mock-user-data';
  }
  return 'C:\\other-path';
});
const protocolHandleMock = vi.fn((name: string, handler: ProtocolHandler) => {
  registeredProtocols[name] = handler;
});
const netFetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
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

const getDatabaseMock = vi.fn(() => ({ id: 'db-mock' }));
const closeDatabaseMock = vi.fn();

const registerVerseHandlersMock = vi.fn();
const registerWorldHandlersMock = vi.fn();
const registerLevelHandlersMock = vi.fn();
const registerCampaignHandlersMock = vi.fn();
const registerBattleMapHandlersMock = vi.fn();
const registerTokenHandlersMock = vi.fn();
const registerArcHandlersMock = vi.fn();
const registerActHandlersMock = vi.fn();
const registerSessionHandlersMock = vi.fn();
const registerSceneHandlersMock = vi.fn();
const registerAbilityHandlersMock = vi.fn();
const registerStatBlockHandlersMock = vi.fn();

vi.mock('electron-squirrel-startup', () => false);
vi.mock('electron', () => ({
  app: {
    on: appOnMock,
    quit: appQuitMock,
    getPath: appGetPathMock,
  },
  BrowserWindow: BrowserWindowMock,
  protocol: {
    handle: protocolHandleMock,
  },
  net: {
    fetch: netFetchMock,
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
    expect(registerWorldHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerLevelHandlersMock).toHaveBeenCalledWith(dbMock);
    expect(registerCampaignHandlersMock).toHaveBeenCalledWith(dbMock);
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

    expect(browserWindowCtorMock).toHaveBeenCalledTimes(1);
    expect(loadFileMock).toHaveBeenCalledTimes(1);
  });

  it('handles protocol and app lifecycle side effects', async () => {
    setForgeGlobals(undefined);
    await importMainWithMocks();
    await registeredEvents.ready();

    expect(protocolHandleMock).toHaveBeenCalledWith('vv-media', expect.any(Function));
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
