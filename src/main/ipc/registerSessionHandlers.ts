import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type SessionUpsertData = {
  act_id: number;
  name?: string;
  notes?: string | null;
  planned_at?: string | null;
  sort_order?: number;
};

function registerSessionReadHandlers(db: Database.Database): void {
  ipcMain.handle(
    IPC.SESSIONS_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number): Session[] => {
      return db
        .prepare(
          `SELECT sessions.* FROM sessions
           JOIN acts ON sessions.act_id = acts.id
           JOIN arcs ON acts.arc_id = arcs.id
           WHERE arcs.campaign_id = ?
           ORDER BY arcs.sort_order ASC, arcs.id ASC, acts.sort_order ASC, acts.id ASC, sessions.sort_order ASC, sessions.id ASC`,
        )
        .all(campaignId) as Session[];
    },
  );

  ipcMain.handle(IPC.SESSIONS_GET_ALL_BY_ACT, (_event, actId: number) => {
    return db
      .prepare(
        'SELECT * FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(actId);
  });

  ipcMain.handle(IPC.SESSIONS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) ?? null;
  });
}

function resequenceSessionsInAct(db: Database.Database, actId: number): void {
  const siblingRows = db
    .prepare(
      'SELECT id FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(actId) as Array<{ id: number; }>;

  siblingRows.forEach((row, index) => {
    db.prepare('UPDATE sessions SET sort_order = ? WHERE id = ?').run(index, row.id);
  });
}

function insertSession(db: Database.Database, data: SessionUpsertData) {
  const sortOrder = data.sort_order === undefined
    ? (
      db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM sessions WHERE act_id = ?',
        )
        .get(data.act_id) as { next_sort_order: number; }
    ).next_sort_order
    : data.sort_order;

  const result = db
    .prepare(
      'INSERT INTO sessions (act_id, name, notes, planned_at, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
    .run(data.act_id, data.name, data.notes ?? null, data.planned_at ?? null, sortOrder);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
  if (!session) {
    throw new Error('Failed to create session');
  }
  return session;
}

function deleteSessionAndCompact(db: Database.Database, id: number) {
  return db.transaction(() => {
    const sessionToDelete = db
      .prepare('SELECT act_id FROM sessions WHERE id = ?')
      .get(id) as { act_id: number; } | undefined;
    if (!sessionToDelete) {
      return { id };
    }

    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    resequenceSessionsInAct(db, sessionToDelete.act_id);
    return { id };
  })();
}

function registerSessionAddHandler(db: Database.Database): void {
  ipcMain.handle(IPC.SESSIONS_ADD, (_event, data: SessionUpsertData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Session name is required');
    }

    return insertSession(db, {
      act_id: data.act_id,
      name,
      notes: data.notes,
      planned_at: data.planned_at,
      sort_order: data.sort_order,
    });
  });
}

function registerSessionUpdateHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.SESSIONS_UPDATE,
    (_event, id: number, data: Omit<SessionUpsertData, 'act_id'>) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasNotes = Object.prototype.hasOwnProperty.call(data, 'notes');
      const hasPlannedAt = Object.prototype.hasOwnProperty.call(data, 'planned_at');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(data, 'sort_order');

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Session name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasNotes && data.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(data.notes);
      }

      if (hasPlannedAt && data.planned_at !== undefined) {
        setClauses.push('planned_at = ?');
        values.push(data.planned_at);
      }

      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE sessions SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
      if (!session) {
        throw new Error('Session not found');
      }
      return session;
    },
  );
}

function registerSessionDeleteHandler(db: Database.Database): void {
  ipcMain.handle(IPC.SESSIONS_DELETE, (_event, id: number) => {
    return deleteSessionAndCompact(db, id);
  });
}

function registerSessionMoveHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.SESSIONS_MOVE_TO_ACT,
    (_event, sessionId: number, newActId: number) => {
      return db.transaction(() => {
        const session = db
          .prepare('SELECT * FROM sessions WHERE id = ?')
          .get(sessionId) as Session | undefined;
        if (!session) {
          throw new Error('Session not found');
        }
        const oldActId = (session as unknown as { act_id: number; }).act_id;

        const { next: newSortOrder } = db
          .prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM sessions WHERE act_id = ?',
          )
          .get(newActId) as { next: number; };

        db.prepare(
          "UPDATE sessions SET act_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(newActId, newSortOrder, sessionId);

        resequenceSessionsInAct(db, oldActId);

        return db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
      })();
    },
  );
}

export function registerSessionHandlers(db: Database.Database): void {
  registerSessionReadHandlers(db);
  registerSessionAddHandler(db);
  registerSessionUpdateHandler(db);
  registerSessionDeleteHandler(db);
  registerSessionMoveHandler(db);
}
