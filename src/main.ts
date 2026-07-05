/**
 * @role Main bootstrap entrypoint
 * @owns BrowserWindow startup, protocol registration, and registrar wiring
 * @seam Main process entrypoint for preload and database adapters
 * @calls getDatabase, closeDatabase, and register*Handlers modules
 */
import { app, BrowserWindow, dialog, net, protocol, shell } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import path from 'path';
import { closeDatabase, getDatabase } from './database/db';
import { createWorldMapsRepo } from './database/repos/worldMapsRepo';
import { registerAbilityHandlers } from './main/ipc/registerAbilityHandlers';
import { registerActHandlers } from './main/ipc/registerActHandlers';
import { registerArcHandlers } from './main/ipc/registerArcHandlers';
import { registerBackgroundHandlers } from './main/ipc/registerBackgroundHandlers';
import { registerBattleMapHandlers } from './main/ipc/registerBattleMapHandlers';
import { registerCampaignHandlers } from './main/ipc/registerCampaignHandlers';
import { registerCampaignNoteHandlers } from './main/ipc/registerCampaignNoteHandlers';
import { registerCharacterHandlers } from './main/ipc/registerCharacterHandlers';
import { registerCharacterRelationshipHandlers } from './main/ipc/registerCharacterRelationshipHandlers';
import { registerFactionHandlers } from './main/ipc/registerFactionHandlers';
import { registerFactionMemberHandlers } from './main/ipc/registerFactionMemberHandlers';
import { registerFactionRelationshipHandlers } from './main/ipc/registerFactionRelationshipHandlers';
import { registerFactionTypeHandlers } from './main/ipc/registerFactionTypeHandlers';
import { registerItemHandlers } from './main/ipc/registerItemHandlers';
import { registerLevelHandlers } from './main/ipc/registerLevelHandlers';
import { registerLoreNoteHandlers } from './main/ipc/registerLoreNoteHandlers';
import { registerSceneHandlers } from './main/ipc/registerSceneHandlers';
import { registerSessionHandlers } from './main/ipc/registerSessionHandlers';
import { registerSettingsHandlers } from './main/ipc/registerSettingsHandlers';
import { registerStatBlockHandlers } from './main/ipc/registerStatBlockHandlers';
import { registerTokenHandlers } from './main/ipc/registerTokenHandlers';
import { registerVerseHandlers } from './main/ipc/registerVerseHandlers';
import { registerWorldHandlers } from './main/ipc/registerWorldHandlers';
import { registerWorldMapHandlers } from './main/ipc/registerWorldMapHandlers';
import { registerWorldMapHostHandlers } from './main/ipc/registerWorldMapHostHandlers';
import { registerWorldTransferHandlers } from './main/ipc/registerWorldTransferHandlers';
import { createWorldMapEditorManager } from './main/worldMapEditorManager';
import { createWorldMapPersistence } from './main/worldMapPersistence';
import { createWorldMapProtocolHandler, WORLD_MAP_PROTOCOL } from './main/worldMapProtocol';
import { createWorldMapSnapshotStore } from './main/worldMapSnapshotStore';

const TOKEN_IMAGE_PROTOCOL = 'vv-media';
const TOKEN_IMAGE_HOST = 'token-images';
const WORLD_IMAGE_HOST = 'world-images';
const CHARACTER_IMAGE_HOST = 'character-images';
const BACKGROUND_IMAGE_HOST = 'background-images';
const ITEM_IMAGE_HOST = 'item-images';
const LORE_NOTE_IMAGE_HOST = 'lore-note-images';
const FACTION_IMAGE_HOST = 'faction-images';
const IS_DEV = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);
const SHOULD_OPEN_DEVTOOLS = IS_DEV && process.env.VV_OPEN_DEVTOOLS === '1';
const SHOULD_INSTALL_REACT_DEVTOOLS = IS_DEV && !process.env.VITEST
  && process.env.VV_ENABLE_REACT_DEVTOOLS === '1';
const gzipAsync = promisify(gzip);

protocol.registerSchemesAsPrivileged([
  {
    scheme: WORLD_MAP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: TOKEN_IMAGE_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function registerTokenImageProtocol(): void {
  protocol.handle(TOKEN_IMAGE_PROTOCOL, async (request) => {
    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url);
    } catch {
      return new Response('Invalid media request URL', { status: 400 });
    }

    // Resolve which directory to serve from based on the URL host.
    let imagesDir: string;
    if (requestUrl.hostname === TOKEN_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'token-images'));
    } else if (requestUrl.hostname === WORLD_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'world-images'));
    } else if (requestUrl.hostname === CHARACTER_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'character-images'));
    } else if (requestUrl.hostname === BACKGROUND_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'background-images'));
    } else if (requestUrl.hostname === ITEM_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'item-images'));
    } else if (requestUrl.hostname === LORE_NOTE_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'lore-note-images'));
    } else if (requestUrl.hostname === FACTION_IMAGE_HOST) {
      imagesDir = path.resolve(path.join(app.getPath('userData'), 'faction-images'));
    } else {
      return new Response('Media host not found', { status: 404 });
    }

    const requestedPath = decodeURIComponent(requestUrl.pathname).replace(
      /^\/+/,
      '',
    );
    const fileName = path.basename(requestedPath);
    if (!fileName || fileName !== requestedPath) {
      return new Response('Invalid media path', { status: 400 });
    }

    const filePath = path.resolve(path.join(imagesDir, fileName));
    if (path.dirname(filePath) !== imagesDir) {
      return new Response('Invalid media path', { status: 400 });
    }

    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch {
      return new Response('Media file not found', { status: 404 });
    }
  });
}

function registerWorldMapProtocol(options: {
  manifestPath: string;
  snapshotDir: string;
}) {
  const handler = createWorldMapProtocolHandler(options);
  protocol.handle(WORLD_MAP_PROTOCOL, (request) => handler.handle(request.url));
  return handler;
}

async function exportWorldMapCopy(mapData: string, suggestedName: string): Promise<boolean> {
  const downloadsDir = app.getPath('downloads');
  const preferredName = suggestedName.endsWith('.map') || suggestedName.endsWith('.map.gz')
    ? suggestedName
    : `${suggestedName}.map.gz`;
  const result = await dialog.showSaveDialog({
    title: 'Export World Map Copy',
    defaultPath: path.join(downloadsDir, preferredName),
    filters: [
      { name: 'FMG map gzip', extensions: ['map.gz'] },
      { name: 'FMG map', extensions: ['map'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  const targetPath = result.filePath;
  await mkdir(path.dirname(targetPath), { recursive: true });
  if (targetPath.toLowerCase().endsWith('.map')) {
    await writeFile(targetPath, mapData, 'utf8');
    return true;
  }

  const bytes = await gzipAsync(Buffer.from(mapData, 'utf8'));
  await writeFile(targetPath, bytes);
  return true;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const SAFE_EXTERNAL_LINK_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

function isSafeExternalUrl(url: string): boolean {
  try {
    return SAFE_EXTERNAL_LINK_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Denies every window.open()/target="_blank" popup (routing safe http(s)/mailto
 * links to the OS browser instead) and blocks top-level navigation away from
 * `isAllowedNavigation`. Without this, an attacker-controlled link rendered in
 * app content (e.g. a note or an imported world bundle) could navigate the
 * trusted window to an arbitrary origin, where the window's preload script
 * would re-run and re-expose its full IPC bridge to that origin.
 */
function hardenWindowNavigation(
  window: BrowserWindow,
  isAllowedNavigation: (url: string) => boolean,
): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
    }
  });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // Stay hidden until the renderer has painted its first frame — showing
    // immediately paints an empty white frame while the page is still loading.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep rendering, timers, and requestAnimationFrame running at full rate
      // even when the window is backgrounded or occluded. The canvas/pixi.js
      // views (battlemaps, world map) must keep painting when the OS foreground
      // is elsewhere; this also makes E2E deterministic under parallel workers,
      // where only one Electron window can hold foreground at a time.
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const devServerOrigin = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
    : null;
  hardenWindowNavigation(mainWindow, (url) => {
    try {
      const target = new URL(url);
      return devServerOrigin ? target.origin === devServerOrigin : target.protocol === 'file:';
    } catch {
      return false;
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools only when explicitly enabled in development.
  if (SHOULD_OPEN_DEVTOOLS) {
    mainWindow.webContents.openDevTools();
  }
};

function createWorldMapEditorWindow(hostPageUrl: string): BrowserWindow {
  const editorWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'World Map',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preloadWorldMap.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // See main window: keep the map canvas painting when backgrounded and
      // keep parallel-worker E2E deterministic.
      backgroundThrottling: false,
    },
  });

  editorWindow.once('ready-to-show', () => {
    editorWindow.show();
  });
  hardenWindowNavigation(editorWindow, (url) => {
    try {
      return new URL(url).protocol === `${WORLD_MAP_PROTOCOL}:`;
    } catch {
      return false;
    }
  });
  editorWindow.loadURL(hostPageUrl);
  return editorWindow;
}

// Register IPC handlers for database operations.
function registerIpcHandlers() {
  const db = getDatabase();
  const worldMapManifestPath = path.join(app.getAppPath(), 'vendor', 'azgaar-fmg', 'MANIFEST.json');
  const worldMapSnapshotDir = path.join(app.getPath('userData'), 'world-maps');
  const appVersion = typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0';
  const worldMapProtocol = registerWorldMapProtocol({
    manifestPath: worldMapManifestPath,
    snapshotDir: worldMapSnapshotDir,
  });

  const worldMapsRepo = createWorldMapsRepo(db);
  const worldMapSnapshotStore = createWorldMapSnapshotStore({ baseDir: worldMapSnapshotDir });
  const worldMapPersistence = createWorldMapPersistence({
    repo: worldMapsRepo,
    store: worldMapSnapshotStore,
  });
  registerVerseHandlers(db);
  registerWorldHandlers(db, {
    cleanupDeletedWorld: async (worldId) => {
      await worldMapPersistence.deleteByWorld(worldId);
    },
  });
  registerWorldTransferHandlers(db, {
    userDataPath: app.getPath('userData'),
    appVersion,
  });
  registerLevelHandlers(db);
  registerCampaignHandlers(db);
  registerCampaignNoteHandlers(db);
  registerBattleMapHandlers(db);
  const worldMapEditorManager = createWorldMapEditorManager({
    getWorld: (worldId) =>
      (db.prepare('SELECT id, name FROM worlds WHERE id = ?').get(worldId) as {
        id: number;
        name: string;
      } | undefined) ?? null,
    persistence: worldMapPersistence,
    createWindow: () => createWorldMapEditorWindow(worldMapProtocol.urls.hostPageUrl),
    vendorEntryUrl: worldMapProtocol.urls.vendorEntryUrl,
    mapFileUrl: (storageKey) => worldMapProtocol.urls.mapFileUrl(storageKey),
    exportCopy: async (_worldId, mapData, suggestedName) => {
      await exportWorldMapCopy(mapData, suggestedName);
      return { ok: true as const };
    },
    confirmDiscardOnCloseFailure: async (worldId, errorMessage) => {
      const result = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Discard', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title: 'World Map Save Failed',
        message: `World map for world #${worldId} failed to save while closing.`,
        detail: `${errorMessage}\n\nDiscard unsaved changes and close window?`,
        noLink: true,
      });
      return result.response === 0;
    },
  });
  registerWorldMapHandlers(db, {
    openEditor: (worldId) => worldMapEditorManager.openWorldMapEditor(worldId),
  });
  registerWorldMapHostHandlers({
    resolveWorldId: (webContentsId) => worldMapEditorManager.resolveWorldId(webContentsId),
    buildSession: (worldId) => worldMapEditorManager.buildSession(worldId),
    saveCurrent: (worldId, mapData, meta) =>
      worldMapEditorManager.saveWorldMapSnapshot(worldId, mapData, meta),
    regenerate: (worldId) => worldMapEditorManager.regenerateWorldMap(worldId),
    exportCopy: (worldId, mapData, suggestedName) =>
      worldMapEditorManager.exportWorldMapCopy(worldId, mapData, suggestedName),
    closeWindow: (webContentsId) => worldMapEditorManager.closeWorldMapWindow(webContentsId),
  });
  registerTokenHandlers(db, {
    userDataPath: app.getPath('userData'),
  });
  registerArcHandlers(db);
  registerActHandlers(db);
  registerSessionHandlers(db);
  registerSceneHandlers(db);
  registerAbilityHandlers(db);
  registerStatBlockHandlers(db);
  registerCharacterHandlers(db);
  registerBackgroundHandlers(db);
  registerItemHandlers(db);
  registerLoreNoteHandlers(db);
  registerCharacterRelationshipHandlers(db);
  registerFactionHandlers(db);
  registerFactionTypeHandlers(db);
  registerFactionMemberHandlers(db);
  registerFactionRelationshipHandlers(db);
  registerSettingsHandlers(db);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  registerIpcHandlers();
  registerTokenImageProtocol();

  if (SHOULD_INSTALL_REACT_DEVTOOLS) {
    try {
      const { installExtension, REACT_DEVELOPER_TOOLS } = await import(
        'electron-devtools-installer'
      );
      await installExtension(REACT_DEVELOPER_TOOLS).catch((err: unknown) => {
        console.error('Failed to install React DevTools:', err);
      });
    } catch (err) {
      console.error('Failed to load React DevTools installer:', err);
    }
  }

  createWindow();
});

app.on('before-quit', () => {
  closeDatabase();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
