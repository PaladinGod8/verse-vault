/**
 * @role Faction relationship IPC registrar
 * @owns Faction<->Faction named relationship (faction_relationships) channel handlers
 * @seam Main-process adapter for faction relationship IPC requests
 * @calls SQLite statements
 */
import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import type {
  FactionRelationshipInput,
  FactionRelationshipUpdateInput,
} from '../../shared/contracts/dbApiPayloads';
import { IPC } from '../../shared/ipcChannels';
import { isSqliteUniqueConstraintError } from './validation';

const GET_ALL_BY_FACTION_SQL = `
  SELECT
    fr.id, fr.faction_id, fr.related_faction_id, fr.faction_label,
    fr.related_label, fr.created_at, fr.updated_at,
    CASE WHEN fr.faction_id = ? THEN fr.related_faction_id ELSE fr.faction_id END
      AS counterpart_id,
    CASE WHEN fr.faction_id = ? THEN rf.name ELSE sf.name END AS counterpart_name,
    CASE WHEN fr.faction_id = ? THEN fr.faction_label ELSE fr.related_label END
      AS subject_label,
    CASE WHEN fr.faction_id = ? THEN fr.related_label ELSE fr.faction_label END
      AS counterpart_label
  FROM faction_relationships fr
  JOIN factions sf ON sf.id = fr.faction_id
  JOIN factions rf ON rf.id = fr.related_faction_id
  WHERE fr.faction_id = ? OR fr.related_faction_id = ?
  ORDER BY fr.created_at ASC
`;

export function registerFactionRelationshipHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.FACTION_RELATIONSHIPS_GET_ALL_BY_FACTION, (_event, factionId: number) => {
    return db
      .prepare(GET_ALL_BY_FACTION_SQL)
      .all(factionId, factionId, factionId, factionId, factionId, factionId);
  });

  ipcMain.handle(IPC.FACTION_RELATIONSHIPS_ADD, (_event, data: FactionRelationshipInput) => {
    if (data.faction_id === data.related_faction_id) {
      throw new Error('A faction cannot have a relationship with itself.');
    }

    const factionLabel = typeof data.faction_label === 'string' ? data.faction_label.trim() : '';
    const relatedLabel = typeof data.related_label === 'string' ? data.related_label.trim() : '';
    if (!factionLabel || !relatedLabel) {
      throw new Error('Both relationship labels are required.');
    }

    try {
      const result = db
        .prepare(
          'INSERT INTO faction_relationships (faction_id, related_faction_id, faction_label, related_label) VALUES (?, ?, ?, ?)',
        )
        .run(data.faction_id, data.related_faction_id, factionLabel, relatedLabel);
      return db
        .prepare('SELECT * FROM faction_relationships WHERE id = ?')
        .get(result.lastInsertRowid);
    } catch (err) {
      if (isSqliteUniqueConstraintError(err)) {
        throw new Error(
          'A relationship with these exact labels already exists between these two factions.',
        );
      }
      throw err;
    }
  });

  ipcMain.handle(
    IPC.FACTION_RELATIONSHIPS_UPDATE,
    (_event, id: number, data: FactionRelationshipUpdateInput) => {
      const setClauses: string[] = [];
      const values: string[] = [];
      if (typeof data.faction_label === 'string') {
        setClauses.push('faction_label = ?');
        values.push(data.faction_label.trim());
      }
      if (typeof data.related_label === 'string') {
        setClauses.push('related_label = ?');
        values.push(data.related_label.trim());
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE faction_relationships SET ${
          setClauses.join(', ')
        }, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE faction_relationships SET updated_at = datetime('now') WHERE id = ?";

      try {
        db.prepare(updateSql).run(...values, id);
      } catch (err) {
        if (isSqliteUniqueConstraintError(err)) {
          throw new Error(
            'A relationship with these exact labels already exists between these two factions.',
          );
        }
        throw err;
      }

      return db.prepare('SELECT * FROM faction_relationships WHERE id = ?').get(id);
    },
  );

  ipcMain.handle(IPC.FACTION_RELATIONSHIPS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM faction_relationships WHERE id = ?').run(id);
    return { id };
  });
}
