import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type ArcUpsertData = {
  campaign_id: number;
  name?: string;
  sort_order?: number;
};

function registerArcReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.ARCS_GET_ALL_BY_CAMPAIGN, (_event, campaignId: number) => {
    return db
      .prepare(
        'SELECT * FROM arcs WHERE campaign_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(campaignId);
  });

  ipcMain.handle(IPC.ARCS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM arcs WHERE id = ?').get(id) ?? null;
  });
}

function insertArc(db: Database.Database, data: ArcUpsertData) {
  const sortOrder = data.sort_order === undefined
    ? (
      db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM arcs WHERE campaign_id = ?',
        )
        .get(data.campaign_id) as { next: number; }
    ).next
    : data.sort_order;
  const result = db
    .prepare('INSERT INTO arcs (campaign_id, name, sort_order) VALUES (?, ?, ?)')
    .run(data.campaign_id, data.name, sortOrder);
  const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(result.lastInsertRowid);
  if (!arc) {
    throw new Error('Failed to create arc');
  }
  return arc;
}

function resequenceArcsInCampaign(db: Database.Database, campaignId: number): void {
  const rows = db
    .prepare(
      'SELECT id FROM arcs WHERE campaign_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(campaignId) as Array<{ id: number; }>;
  rows.forEach((row, index) => {
    db.prepare('UPDATE arcs SET sort_order = ? WHERE id = ?').run(index, row.id);
  });
}

function deleteArcAndCompact(db: Database.Database, id: number) {
  return db.transaction(() => {
    const arc = db
      .prepare('SELECT campaign_id FROM arcs WHERE id = ?')
      .get(id) as { campaign_id: number; } | undefined;
    if (!arc) {
      return { id };
    }
    db.prepare('DELETE FROM arcs WHERE id = ?').run(id);
    resequenceArcsInCampaign(db, arc.campaign_id);
    return { id };
  })();
}

function registerArcAddHandler(db: Database.Database): void {
  ipcMain.handle(IPC.ARCS_ADD, (_event, data: ArcUpsertData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Arc name is required');
    }
    return insertArc(db, {
      campaign_id: data.campaign_id,
      name,
      sort_order: data.sort_order,
    });
  });
}

function registerArcUpdateHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.ARCS_UPDATE,
    (_event, id: number, data: Omit<ArcUpsertData, 'campaign_id'>) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(data, 'sort_order');
      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Arc name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }
      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const sql = setClauses.length > 0
        ? `UPDATE arcs SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE arcs SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(sql).run(...values, id);

      const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(id);
      if (!arc) {
        throw new Error('Arc not found');
      }
      return arc;
    },
  );
}

function registerArcDeleteHandler(db: Database.Database): void {
  ipcMain.handle(IPC.ARCS_DELETE, (_event, id: number) => {
    return deleteArcAndCompact(db, id);
  });
}

export function registerArcHandlers(db: Database.Database): void {
  registerArcReadHandlers(db);
  registerArcAddHandler(db);
  registerArcUpdateHandler(db);
  registerArcDeleteHandler(db);
}
