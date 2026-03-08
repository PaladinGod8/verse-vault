import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type CampaignAddData = {
  world_id: number;
  name: string;
  summary?: string | null;
  config?: string;
};

type CampaignUpdateData = {
  name?: string;
  summary?: string | null;
  config?: string;
};

export function registerCampaignHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.CAMPAIGNS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM campaigns WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.CAMPAIGNS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(IPC.CAMPAIGNS_ADD, (_event, data: CampaignAddData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Campaign name is required');
    }

    const result = db
      .prepare(
        'INSERT INTO campaigns (world_id, name, summary, config) VALUES (?, ?, ?, ?)',
      )
      .run(data.world_id, name, data.summary ?? null, data.config ?? '{}');

    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!campaign) {
      throw new Error('Failed to create campaign');
    }
    return campaign;
  });

  ipcMain.handle(
    IPC.CAMPAIGNS_UPDATE,
    (_event, id: number, data: CampaignUpdateData) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSummary = Object.prototype.hasOwnProperty.call(data, 'summary');
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Campaign name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasSummary && data.summary !== undefined) {
        setClauses.push('summary = ?');
        values.push(data.summary);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(data.config);
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE campaigns SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE campaigns SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const campaign = db
        .prepare('SELECT * FROM campaigns WHERE id = ?')
        .get(id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      return campaign;
    },
  );

  ipcMain.handle(IPC.CAMPAIGNS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    return { id };
  });
}
