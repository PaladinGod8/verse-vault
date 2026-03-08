import { app, BrowserWindow, net, protocol } from 'electron';
import { pathToFileURL } from 'node:url';
import path from 'path';
import {
  closeDatabase,
  getDatabase,
} from './database/db';
import { registerActHandlers } from './main/ipc/registerActHandlers';
import { registerAbilityHandlers } from './main/ipc/registerAbilityHandlers';
import { registerArcHandlers } from './main/ipc/registerArcHandlers';
import { registerBattleMapHandlers } from './main/ipc/registerBattleMapHandlers';
import { registerCampaignHandlers } from './main/ipc/registerCampaignHandlers';
import { registerLevelHandlers } from './main/ipc/registerLevelHandlers';
import { registerSceneHandlers } from './main/ipc/registerSceneHandlers';
import { registerSessionHandlers } from './main/ipc/registerSessionHandlers';
import { registerStatBlockHandlers } from './main/ipc/registerStatBlockHandlers';
import { registerTokenHandlers } from './main/ipc/registerTokenHandlers';
import { registerVerseHandlers } from './main/ipc/registerVerseHandlers';
import { registerWorldHandlers } from './main/ipc/registerWorldHandlers';

const TOKEN_IMAGE_PROTOCOL = 'vv-media';
const TOKEN_IMAGE_HOST = 'token-images';
const WORLD_IMAGE_HOST = 'world-images';

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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools only in development.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Register IPC handlers for database operations.
function registerIpcHandlers() {
  const db = getDatabase();

  registerVerseHandlers(db);
  registerWorldHandlers(db);
  registerLevelHandlers(db);
  registerCampaignHandlers(db);
  registerBattleMapHandlers(db);
  registerTokenHandlers(db, {
    userDataPath: app.getPath('userData'),
  });
  registerArcHandlers(db);
  registerActHandlers(db);
  registerSessionHandlers(db);
  registerSceneHandlers(db);
  registerAbilityHandlers(db);
  registerStatBlockHandlers(db);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  registerIpcHandlers();
  registerTokenImageProtocol();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL && !process.env.VITEST) {
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

