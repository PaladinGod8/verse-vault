import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './database/db';
import { IPC } from './shared/ipcChannels';

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

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Register IPC handlers for database operations.
function registerIpcHandlers() {
  const db = getDatabase();

  ipcMain.handle(IPC.VERSES_GET_ALL, () => {
    return db.prepare('SELECT * FROM verses ORDER BY created_at DESC').all();
  });

  ipcMain.handle(
    IPC.VERSES_ADD,
    (_event, data: { text: string; reference?: string; tags?: string }) => {
      const stmt = db.prepare(
        'INSERT INTO verses (text, reference, tags) VALUES (?, ?, ?)',
      );
      const result = stmt.run(
        data.text,
        data.reference ?? null,
        data.tags ?? null,
      );
      return db
        .prepare('SELECT * FROM verses WHERE id = ?')
        .get(result.lastInsertRowid);
    },
  );

  ipcMain.handle(
    IPC.VERSES_UPDATE,
    (
      _event,
      id: number,
      data: { text?: string; reference?: string; tags?: string },
    ) => {
      db.prepare(
        `
      UPDATE verses SET
        text = COALESCE(?, text),
        reference = COALESCE(?, reference),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
      WHERE id = ?
    `,
      ).run(data.text ?? null, data.reference ?? null, data.tags ?? null, id);
      return db.prepare('SELECT * FROM verses WHERE id = ?').get(id);
    },
  );

  ipcMain.handle(IPC.VERSES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM verses WHERE id = ?').run(id);
    return { id };
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  registerIpcHandlers();
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
