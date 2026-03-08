import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

export function registerVerseHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.VERSES_GET_ALL, () => {
    return db.prepare('SELECT * FROM verses ORDER BY created_at DESC').all();
  });

  ipcMain.handle(
    IPC.VERSES_ADD,
    (_event, data: { text: string; reference?: string; tags?: string; }) => {
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
      data: { text?: string; reference?: string; tags?: string; },
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
