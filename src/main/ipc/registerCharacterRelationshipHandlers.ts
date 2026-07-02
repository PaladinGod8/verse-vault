/**
 * @role Character relationship IPC registrar
 * @owns Character<->Character named relationship (character_relationships) channel handlers
 * @seam Main-process adapter for character relationship IPC requests
 * @calls SQLite statements
 */
import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import type {
  CharacterRelationshipInput,
  CharacterRelationshipUpdateInput,
} from '../../shared/contracts/dbApiPayloads';
import { IPC } from '../../shared/ipcChannels';
import { isSqliteUniqueConstraintError } from './validation';

const GET_ALL_BY_CHARACTER_SQL = `
  SELECT
    cr.id, cr.character_id, cr.related_character_id, cr.character_label,
    cr.related_label, cr.created_at, cr.updated_at,
    CASE WHEN cr.character_id = ? THEN cr.related_character_id ELSE cr.character_id END
      AS counterpart_id,
    CASE WHEN cr.character_id = ? THEN rc.name ELSE sc.name END AS counterpart_name,
    CASE WHEN cr.character_id = ? THEN cr.character_label ELSE cr.related_label END
      AS subject_label,
    CASE WHEN cr.character_id = ? THEN cr.related_label ELSE cr.character_label END
      AS counterpart_label
  FROM character_relationships cr
  JOIN characters sc ON sc.id = cr.character_id
  JOIN characters rc ON rc.id = cr.related_character_id
  WHERE cr.character_id = ? OR cr.related_character_id = ?
  ORDER BY cr.created_at ASC
`;

export function registerCharacterRelationshipHandlers(db: Database.Database): void {
  ipcMain.handle(
    IPC.CHARACTER_RELATIONSHIPS_GET_ALL_BY_CHARACTER,
    (_event, characterId: number) => {
      return db
        .prepare(GET_ALL_BY_CHARACTER_SQL)
        .all(characterId, characterId, characterId, characterId, characterId, characterId);
    },
  );

  ipcMain.handle(IPC.CHARACTER_RELATIONSHIPS_ADD, (_event, data: CharacterRelationshipInput) => {
    if (data.character_id === data.related_character_id) {
      throw new Error('A character cannot have a relationship with themselves.');
    }

    const characterLabel = typeof data.character_label === 'string'
      ? data.character_label.trim()
      : '';
    const relatedLabel = typeof data.related_label === 'string' ? data.related_label.trim() : '';
    if (!characterLabel || !relatedLabel) {
      throw new Error('Both relationship labels are required.');
    }

    try {
      const result = db
        .prepare(
          'INSERT INTO character_relationships (character_id, related_character_id, character_label, related_label) VALUES (?, ?, ?, ?)',
        )
        .run(data.character_id, data.related_character_id, characterLabel, relatedLabel);
      return db
        .prepare('SELECT * FROM character_relationships WHERE id = ?')
        .get(result.lastInsertRowid);
    } catch (err) {
      if (isSqliteUniqueConstraintError(err)) {
        throw new Error(
          'A relationship with these exact labels already exists between these two characters.',
        );
      }
      throw err;
    }
  });

  ipcMain.handle(
    IPC.CHARACTER_RELATIONSHIPS_UPDATE,
    (_event, id: number, data: CharacterRelationshipUpdateInput) => {
      const setClauses: string[] = [];
      const values: string[] = [];
      if (typeof data.character_label === 'string') {
        setClauses.push('character_label = ?');
        values.push(data.character_label.trim());
      }
      if (typeof data.related_label === 'string') {
        setClauses.push('related_label = ?');
        values.push(data.related_label.trim());
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE character_relationships SET ${
          setClauses.join(', ')
        }, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE character_relationships SET updated_at = datetime('now') WHERE id = ?";

      try {
        db.prepare(updateSql).run(...values, id);
      } catch (err) {
        if (isSqliteUniqueConstraintError(err)) {
          throw new Error(
            'A relationship with these exact labels already exists between these two characters.',
          );
        }
        throw err;
      }

      return db.prepare('SELECT * FROM character_relationships WHERE id = ?').get(id);
    },
  );

  ipcMain.handle(IPC.CHARACTER_RELATIONSHIPS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM character_relationships WHERE id = ?').run(id);
    return { id };
  });
}
