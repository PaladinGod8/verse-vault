/**
 * @role Settings IPC registrar
 * @owns App-wide settings singleton row get/update handlers
 * @seam Main-process adapter for settings IPC requests
 * @calls SQLite statements only
 */
import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

function ensureSettingsRow(db: Database.Database): void {
  db.prepare(
    `INSERT INTO app_settings (id, config) VALUES (1, '{}') ON CONFLICT(id) DO NOTHING`,
  ).run();
}

export function registerSettingsHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    ensureSettingsRow(db);
    return db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  });

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, config: string) => {
    ensureSettingsRow(db);
    db.prepare(
      `UPDATE app_settings SET config = ?, updated_at = datetime('now') WHERE id = 1`,
    ).run(config);
    return db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  });
}
