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

  // Open DevTools only in development.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Register IPC handlers for database operations.
function registerIpcHandlers() {
  const db = getDatabase();

  ipcMain.handle(IPC.VERSES_GET_ALL, () => {
    return db.prepare('SELECT * FROM verses ORDER BY created_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_ALL, () => {
    return db.prepare('SELECT * FROM worlds ORDER BY updated_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.WORLDS_ADD,
    (
      _event,
      data: {
        name: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('World name is required');
      }

      const stmt = db.prepare(
        'INSERT INTO worlds (name, thumbnail, short_description) VALUES (?, ?, ?)',
      );
      const result = stmt.run(
        name,
        data.thumbnail ?? null,
        data.short_description ?? null,
      );

      const world = db
        .prepare('SELECT * FROM worlds WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!world) {
        throw new Error('Failed to create world');
      }
      return world;
    },
  );

  ipcMain.handle(
    IPC.WORLDS_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasThumbnail = Object.prototype.hasOwnProperty.call(
        data,
        'thumbnail',
      );
      const hasShortDescription = Object.prototype.hasOwnProperty.call(
        data,
        'short_description',
      );

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('World name is required');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasThumbnail && data.thumbnail !== undefined) {
        setClauses.push('thumbnail = ?');
        values.push(data.thumbnail);
      }

      if (hasShortDescription && data.short_description !== undefined) {
        setClauses.push('short_description = ?');
        values.push(data.short_description);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE worlds SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE worlds SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const world = db.prepare('SELECT * FROM worlds WHERE id = ?').get(id);
      if (!world) {
        throw new Error('World not found');
      }
      return world;
    },
  );

  ipcMain.handle(IPC.WORLDS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.WORLDS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE worlds SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
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
