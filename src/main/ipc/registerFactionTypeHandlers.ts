/**
 * @role Faction type IPC registrar
 * @owns Per-world faction type CRUD channel handlers
 * @seam Main-process adapter for faction type IPC requests
 * @calls SQLite statements
 */
import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Error
    && 'code' in err
    && (err as { code?: string; }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

function ensureFactionTypeName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    throw new Error('Faction type name is required');
  }
  return name;
}

export function registerFactionTypeHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.FACTION_TYPES_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare('SELECT * FROM faction_types WHERE world_id = ? ORDER BY name ASC')
      .all(worldId);
  });

  ipcMain.handle(
    IPC.FACTION_TYPES_ADD,
    (_event, data: { world_id?: number; name?: string; }) => {
      const worldId = typeof data.world_id === 'number' ? data.world_id : null;
      if (!worldId) {
        throw new Error('Faction type world_id is required');
      }
      const name = ensureFactionTypeName(data.name);

      try {
        const result = db
          .prepare('INSERT INTO faction_types (world_id, name) VALUES (?, ?)')
          .run(worldId, name);
        return db
          .prepare('SELECT * FROM faction_types WHERE id = ?')
          .get(result.lastInsertRowid);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new Error('A faction type with this name already exists.');
        }
        throw err;
      }
    },
  );

  ipcMain.handle(IPC.FACTION_TYPES_RENAME, (_event, id: number, name: string) => {
    const trimmedName = ensureFactionTypeName(name);

    try {
      db.prepare('UPDATE faction_types SET name = ? WHERE id = ?').run(trimmedName, id);
      return db.prepare('SELECT * FROM faction_types WHERE id = ?').get(id);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new Error('A faction type with this name already exists.');
      }
      throw err;
    }
  });

  ipcMain.handle(IPC.FACTION_TYPES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM faction_types WHERE id = ?').run(id);
    return { id };
  });
}
