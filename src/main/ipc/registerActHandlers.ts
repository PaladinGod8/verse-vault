import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type ActUpsertData = {
  arc_id: number;
  name?: string;
  sort_order?: number;
};

function registerActReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.ACTS_GET_ALL_BY_ARC, (_event, arcId: number) => {
    return db
      .prepare(
        'SELECT * FROM acts WHERE arc_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(arcId);
  });

  ipcMain.handle(IPC.ACTS_GET_ALL_BY_CAMPAIGN, (_event, campaignId: number) => {
    return db
      .prepare(
        `SELECT acts.* FROM acts
           JOIN arcs ON acts.arc_id = arcs.id
           WHERE arcs.campaign_id = ?
           ORDER BY arcs.sort_order ASC, arcs.id ASC, acts.sort_order ASC, acts.id ASC`,
      )
      .all(campaignId);
  });

  ipcMain.handle(IPC.ACTS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM acts WHERE id = ?').get(id) ?? null;
  });
}

function insertAct(db: Database.Database, data: ActUpsertData) {
  const sortOrder = data.sort_order === undefined
    ? (
      db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM acts WHERE arc_id = ?',
        )
        .get(data.arc_id) as { next: number; }
    ).next
    : data.sort_order;
  const result = db
    .prepare('INSERT INTO acts (arc_id, name, sort_order) VALUES (?, ?, ?)')
    .run(data.arc_id, data.name, sortOrder);
  const act = db.prepare('SELECT * FROM acts WHERE id = ?').get(result.lastInsertRowid);
  if (!act) {
    throw new Error('Failed to create act');
  }
  return act;
}

function resequenceActsInArc(db: Database.Database, arcId: number): void {
  const rows = db
    .prepare(
      'SELECT id FROM acts WHERE arc_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(arcId) as Array<{ id: number; }>;
  rows.forEach((row, index) => {
    db.prepare('UPDATE acts SET sort_order = ? WHERE id = ?').run(index, row.id);
  });
}

function deleteActAndCompact(db: Database.Database, id: number) {
  return db.transaction(() => {
    const act = db.prepare('SELECT arc_id FROM acts WHERE id = ?').get(id) as
      | { arc_id: number; }
      | undefined;
    if (!act) {
      return { id };
    }
    db.prepare('DELETE FROM acts WHERE id = ?').run(id);
    resequenceActsInArc(db, act.arc_id);
    return { id };
  })();
}

function registerActAddHandler(db: Database.Database): void {
  ipcMain.handle(IPC.ACTS_ADD, (_event, data: ActUpsertData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Act name is required');
    }
    return insertAct(db, {
      arc_id: data.arc_id,
      name,
      sort_order: data.sort_order,
    });
  });
}

function registerActUpdateHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.ACTS_UPDATE,
    (_event, id: number, data: Omit<ActUpsertData, 'arc_id'>) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(data, 'sort_order');
      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Act name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }
      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const sql = setClauses.length > 0
        ? `UPDATE acts SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE acts SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(sql).run(...values, id);

      const act = db.prepare('SELECT * FROM acts WHERE id = ?').get(id);
      if (!act) {
        throw new Error('Act not found');
      }
      return act;
    },
  );
}

function registerActDeleteHandler(db: Database.Database): void {
  ipcMain.handle(IPC.ACTS_DELETE, (_event, id: number) => {
    return deleteActAndCompact(db, id);
  });
}

function registerActMoveHandler(db: Database.Database): void {
  ipcMain.handle(IPC.ACTS_MOVE_TO_ARC, (_event, actId: number, newArcId: number) => {
    return db.transaction(() => {
      const act = db.prepare('SELECT * FROM acts WHERE id = ?').get(actId) as
        | Act
        | undefined;
      if (!act) {
        throw new Error('Act not found');
      }
      const oldArcId = (act as unknown as { arc_id: number; }).arc_id;

      const { next: newSortOrder } = db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM acts WHERE arc_id = ?',
        )
        .get(newArcId) as { next: number; };

      db.prepare(
        "UPDATE acts SET arc_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(newArcId, newSortOrder, actId);

      resequenceActsInArc(db, oldArcId);

      return db.prepare('SELECT * FROM acts WHERE id = ?').get(actId);
    })();
  });
}

export function registerActHandlers(db: Database.Database): void {
  registerActReadHandlers(db);
  registerActAddHandler(db);
  registerActUpdateHandler(db);
  registerActDeleteHandler(db);
  registerActMoveHandler(db);
}
