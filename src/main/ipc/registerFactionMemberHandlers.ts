/**
 * @role Faction membership IPC registrar
 * @owns Character<->Faction junction (faction_members) channel handlers
 * @seam Main-process adapter for faction membership IPC requests
 * @calls SQLite statements
 */
import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type FactionMemberInput = {
  character_id: number;
  role: string;
};

// A character with no prior faction membership anywhere defaults to making
// their next faction assignment their primary faction.
function findCharactersWithNoFaction(
  db: Database.Database,
  characterIds: number[],
): Set<number> {
  const charactersWithNoFaction = new Set(characterIds);
  if (characterIds.length === 0) {
    return charactersWithNoFaction;
  }
  const placeholders = characterIds.map(() => '?').join(', ');
  const existingMemberships = db
    .prepare(
      `SELECT DISTINCT character_id FROM faction_members WHERE character_id IN (${placeholders})`,
    )
    .all(...characterIds) as Array<{ character_id: number; }>;
  for (const row of existingMemberships) {
    charactersWithNoFaction.delete(row.character_id);
  }
  return charactersWithNoFaction;
}

export function registerFactionMemberHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.FACTION_MEMBERS_GET_ALL_BY_FACTION, (_event, factionId: number) => {
    return db
      .prepare(
        `SELECT fm.*, c.name AS character_name
         FROM faction_members fm
         JOIN characters c ON c.id = fm.character_id
         WHERE fm.faction_id = ?`,
      )
      .all(factionId);
  });

  ipcMain.handle(IPC.FACTION_MEMBERS_GET_ALL_BY_CHARACTER, (_event, characterId: number) => {
    return db
      .prepare(
        `SELECT fm.*, f.name AS faction_name
         FROM faction_members fm
         JOIN factions f ON f.id = fm.faction_id
         WHERE fm.character_id = ?`,
      )
      .all(characterId);
  });

  ipcMain.handle(IPC.FACTION_MEMBERS_GET_ALL_PRIMARY_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        `SELECT fm.character_id, fm.faction_id
         FROM faction_members fm
         JOIN characters c ON c.id = fm.character_id
         WHERE c.world_id = ? AND fm.is_primary = 1`,
      )
      .all(worldId);
  });

  ipcMain.handle(
    IPC.FACTION_MEMBERS_SET_FOR_FACTION,
    (_event, factionId: number, members: FactionMemberInput[]) => {
      const runReplace = db.transaction(() => {
        const existingPrimaryRows = db
          .prepare(
            'SELECT character_id, is_primary FROM faction_members WHERE faction_id = ? AND is_primary = 1',
          )
          .all(factionId) as Array<{ character_id: number; is_primary: number; }>;
        const primaryCharacterIds = new Set(existingPrimaryRows.map((row) => row.character_id));

        const characterIds = members
          .map((member) => member.character_id)
          .filter((id) => Number.isInteger(id) && id > 0);
        const charactersWithNoFaction = findCharactersWithNoFaction(db, characterIds);

        db.prepare('DELETE FROM faction_members WHERE faction_id = ?').run(factionId);

        const insertStmt = db.prepare(
          'INSERT INTO faction_members (faction_id, character_id, role, is_primary) VALUES (?, ?, ?, ?)',
        );
        for (const member of members) {
          // character_id 0 is the "no character picked yet" sentinel used by the
          // member-picker combobox for an incomplete row - never persist it.
          if (!Number.isInteger(member.character_id) || member.character_id <= 0) {
            continue;
          }
          const isPrimary = primaryCharacterIds.has(member.character_id)
              || charactersWithNoFaction.has(member.character_id)
            ? 1
            : 0;
          insertStmt.run(factionId, member.character_id, member.role, isPrimary);
        }
      });

      runReplace();
      return { faction_id: factionId };
    },
  );

  ipcMain.handle(
    IPC.FACTION_MEMBERS_SET_PRIMARY,
    (_event, characterId: number, factionId: number) => {
      const runSetPrimary = db.transaction(() => {
        db.prepare('UPDATE faction_members SET is_primary = 0 WHERE character_id = ?').run(
          characterId,
        );
        db.prepare(
          'UPDATE faction_members SET is_primary = 1 WHERE character_id = ? AND faction_id = ?',
        ).run(characterId, factionId);
      });

      runSetPrimary();
      return { character_id: characterId, faction_id: factionId };
    },
  );
}
