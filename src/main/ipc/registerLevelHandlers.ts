import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type LevelAddData = {
  world_id: number;
  name: string;
  category: string;
  description?: string | null;
};

type LevelUpdateData = {
  name?: string;
  category?: string;
  description?: string | null;
};

export function registerLevelHandlers(db: Database.Database): void {
  registerLevelReadHandlers(db);
  registerLevelMutationHandlers(db);
}

function registerLevelReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.LEVELS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM levels WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.LEVELS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM levels WHERE id = ?').get(id) ?? null;
  });
}

function registerLevelMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.LEVELS_ADD, (_event, data: LevelAddData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Level name is required');
    }
    const category = typeof data.category === 'string' ? data.category.trim() : '';
    if (!category) {
      throw new Error('Level category is required');
    }

    const result = db
      .prepare(
        'INSERT INTO levels (world_id, name, category, description) VALUES (?, ?, ?, ?)',
      )
      .run(data.world_id, name, category, data.description ?? null);

    const level = db
      .prepare('SELECT * FROM levels WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!level) {
      throw new Error('Failed to create level');
    }
    return level;
  });

  ipcMain.handle(
    IPC.LEVELS_UPDATE,
    (_event, id: number, data: LevelUpdateData) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasCategory = Object.prototype.hasOwnProperty.call(
        data,
        'category',
      );
      const hasDescription = Object.prototype.hasOwnProperty.call(
        data,
        'description',
      );

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Level name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasCategory) {
        const trimmedCategory = typeof data.category === 'string' ? data.category.trim() : '';
        if (!trimmedCategory) {
          throw new Error('Level category cannot be empty');
        }
        setClauses.push('category = ?');
        values.push(trimmedCategory);
      }

      if (hasDescription && data.description !== undefined) {
        setClauses.push('description = ?');
        values.push(data.description);
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE levels SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE levels SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(id);
      if (!level) {
        throw new Error('Level not found');
      }
      return level;
    },
  );

  ipcMain.handle(IPC.LEVELS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM levels WHERE id = ?').run(id);
    return { id };
  });
}
