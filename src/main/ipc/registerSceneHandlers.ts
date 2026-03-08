import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';
import { isJsonRecord, parseJsonText } from './validation';

type SceneUpsertData = {
  session_id: number;
  name?: string;
  notes?: string | null;
  payload?: string;
  sort_order?: number;
};

function ensureScenePayloadJsonText(payload: unknown): string {
  const parsedPayload = parseJsonText(payload, 'Scene payload');

  if (
    isJsonRecord(parsedPayload)
    && Object.prototype.hasOwnProperty.call(parsedPayload, 'runtime')
  ) {
    const runtimePayload = parsedPayload.runtime as ScenePayload['runtime'];
    if (!isJsonRecord(runtimePayload)) {
      throw new Error('Scene payload runtime must be a JSON object');
    }
    if (Object.prototype.hasOwnProperty.call(runtimePayload, 'battlemap_id')) {
      const battleMapId = runtimePayload.battlemap_id;
      if (
        battleMapId !== null
        && (!Number.isInteger(battleMapId) || (battleMapId as number) <= 0)
      ) {
        throw new Error(
          'Scene payload runtime.battlemap_id must be a positive integer or null',
        );
      }
    }
  }

  return payload as string;
}

function registerSceneReadHandlers(db: Database.Database): void {
  ipcMain.handle(
    IPC.SCENES_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number): CampaignSceneListItem[] => {
      return db
        .prepare(
          `
          SELECT
            scenes.id,
            scenes.session_id,
            scenes.name,
            scenes.notes,
            scenes.payload,
            scenes.sort_order,
            scenes.created_at,
            scenes.updated_at,
            sessions.name AS session_name,
            acts.id AS act_id,
            acts.name AS act_name,
            arcs.id AS arc_id,
            arcs.name AS arc_name
          FROM scenes
          INNER JOIN sessions ON sessions.id = scenes.session_id
          INNER JOIN acts ON acts.id = sessions.act_id
          INNER JOIN arcs ON arcs.id = acts.arc_id
          WHERE arcs.campaign_id = ?
          ORDER BY
            arcs.sort_order ASC,
            arcs.id ASC,
            acts.sort_order ASC,
            acts.id ASC,
            sessions.sort_order ASC,
            sessions.id ASC,
            scenes.sort_order ASC,
            scenes.id ASC
          `,
        )
        .all(campaignId) as CampaignSceneListItem[];
    },
  );

  ipcMain.handle(IPC.SCENES_GET_ALL_BY_SESSION, (_event, sessionId: number) => {
    return db
      .prepare(
        'SELECT * FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(sessionId);
  });

  ipcMain.handle(IPC.SCENES_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) ?? null;
  });
}

function resequenceScenesInSession(db: Database.Database, sessionId: number): void {
  const siblingRows = db
    .prepare(
      'SELECT id FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(sessionId) as Array<{ id: number; }>;

  siblingRows.forEach((row, index) => {
    db.prepare('UPDATE scenes SET sort_order = ? WHERE id = ?').run(index, row.id);
  });
}

function insertScene(db: Database.Database, data: SceneUpsertData) {
  const sortOrder = data.sort_order === undefined
    ? (
      db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM scenes WHERE session_id = ?',
        )
        .get(data.session_id) as { next_sort_order: number; }
    ).next_sort_order
    : data.sort_order;

  const result = db
    .prepare(
      'INSERT INTO scenes (session_id, name, notes, payload, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
    .run(data.session_id, data.name, data.notes ?? null, data.payload, sortOrder);

  const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(result.lastInsertRowid);
  if (!scene) {
    throw new Error('Failed to create scene');
  }
  return scene;
}

function deleteSceneAndCompact(db: Database.Database, id: number) {
  return db.transaction(() => {
    const sceneToDelete = db
      .prepare('SELECT session_id FROM scenes WHERE id = ?')
      .get(id) as { session_id: number; } | undefined;
    if (!sceneToDelete) {
      return { id };
    }

    db.prepare('DELETE FROM scenes WHERE id = ?').run(id);
    resequenceScenesInSession(db, sceneToDelete.session_id);
    return { id };
  })();
}

function registerSceneAddHandler(db: Database.Database): void {
  ipcMain.handle(IPC.SCENES_ADD, (_event, data: SceneUpsertData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Scene name is required');
    }

    const payload = data.payload === undefined
      ? '{}'
      : ensureScenePayloadJsonText(data.payload);

    return insertScene(db, {
      session_id: data.session_id,
      name,
      notes: data.notes,
      payload,
      sort_order: data.sort_order,
    });
  });
}

function registerSceneUpdateHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.SCENES_UPDATE,
    (_event, id: number, data: Omit<SceneUpsertData, 'session_id'>) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasNotes = Object.prototype.hasOwnProperty.call(data, 'notes');
      const hasPayload = Object.prototype.hasOwnProperty.call(data, 'payload');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(data, 'sort_order');

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Scene name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasNotes && data.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(data.notes);
      }

      if (hasPayload && data.payload !== undefined) {
        setClauses.push('payload = ?');
        values.push(ensureScenePayloadJsonText(data.payload));
      }

      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE scenes SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE scenes SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id);
      if (!scene) {
        throw new Error('Scene not found');
      }
      return scene;
    },
  );
}

function registerSceneDeleteHandler(db: Database.Database): void {
  ipcMain.handle(IPC.SCENES_DELETE, (_event, id: number) => {
    return deleteSceneAndCompact(db, id);
  });
}

function registerSceneMoveHandler(db: Database.Database): void {
  const getSessionByIdStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const getSceneByIdStmt = db.prepare('SELECT * FROM scenes WHERE id = ?');

  ipcMain.handle(
    IPC.SCENES_MOVE_TO_SESSION,
    (_event, sceneId: number, newSessionId: number) => {
      return db.transaction(() => {
        const scene = getSceneByIdStmt.get(sceneId) as Scene | undefined;
        if (!scene) {
          throw new Error('Scene not found');
        }

        const targetSession = getSessionByIdStmt.get(newSessionId) as
          | Session
          | undefined;
        if (!targetSession) {
          throw new Error('Target session not found');
        }

        const oldSessionId = (scene as unknown as { session_id: number; }).session_id;
        if (newSessionId === oldSessionId) {
          return scene;
        }

        const { nextSortOrder } = db
          .prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder FROM scenes WHERE session_id = ?',
          )
          .get(newSessionId) as { nextSortOrder: number; };

        db.prepare(
          "UPDATE scenes SET session_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(newSessionId, nextSortOrder, sceneId);

        resequenceScenesInSession(db, oldSessionId);

        const movedScene = getSceneByIdStmt.get(sceneId) as Scene | undefined;
        if (!movedScene) {
          throw new Error('Scene not found');
        }
        return movedScene;
      })();
    },
  );
}

export function registerSceneHandlers(db: Database.Database): void {
  registerSceneReadHandlers(db);
  registerSceneAddHandler(db);
  registerSceneUpdateHandler(db);
  registerSceneDeleteHandler(db);
  registerSceneMoveHandler(db);
}
