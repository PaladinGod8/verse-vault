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

        db.prepare('DELETE FROM faction_members WHERE faction_id = ?').run(factionId);

        const insertStmt = db.prepare(
          'INSERT INTO faction_members (faction_id, character_id, role, is_primary) VALUES (?, ?, ?, ?)',
        );
        for (const member of members) {
          const isPrimary = primaryCharacterIds.has(member.character_id) ? 1 : 0;
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
