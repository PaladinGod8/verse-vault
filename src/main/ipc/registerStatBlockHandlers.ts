import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';
import {
  ensureFiniteNumber,
  isJsonRecord,
  isSqliteUniqueConstraintError,
  parseJsonText,
} from './validation';

type JsonRecord = Record<string, unknown>;

function normalizeStatBlockSkills(input: unknown): StatBlockSkillValue[] {
  if (!Array.isArray(input)) {
    throw new Error('StatBlock config skills must be an array');
  }

  const deduped = new Map<string, StatBlockSkillValue>();
  input.forEach((entry, index) => {
    if (!isJsonRecord(entry)) {
      throw new Error(`StatBlock config skills[${index}] must be an object`);
    }

    const keyCandidate = typeof entry.key === 'string' ? entry.key.trim() : '';
    if (!keyCandidate) {
      throw new Error(`StatBlock config skills[${index}].key is required`);
    }

    const rank = ensureFiniteNumber(
      entry.rank,
      `StatBlock config skills[${index}].rank`,
    );

    deduped.set(keyCandidate, {
      key: keyCandidate,
      rank,
    });
  });

  return [...deduped.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function ensureStatBlockConfigJsonText(config: unknown): string {
  const parsedConfig = parseJsonText(config, 'StatBlock config');
  if (!isJsonRecord(parsedConfig)) {
    throw new Error('StatBlock config must be a JSON object');
  }

  const normalizedConfig: JsonRecord = { ...parsedConfig };
  if (Object.prototype.hasOwnProperty.call(parsedConfig, 'skills')) {
    normalizedConfig.skills = normalizeStatBlockSkills(parsedConfig.skills);
  }

  return JSON.stringify(normalizedConfig);
}

function registerStatBlockReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.STATBLOCKS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM statblocks WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(
    IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number) => {
      return db
        .prepare(
          'SELECT * FROM statblocks WHERE campaign_id = ? ORDER BY updated_at DESC',
        )
        .all(campaignId);
    },
  );

  ipcMain.handle(IPC.STATBLOCKS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM statblocks WHERE id = ?').get(id) ?? null;
  });
}

function registerStatBlockAddHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.STATBLOCKS_ADD,
    (
      _event,
      data: {
        world_id: number;
        campaign_id?: number | null;
        name: string;
        description?: string | null;
        config?: string;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('StatBlock name is required');
      }

      const result = db
        .prepare(
          'INSERT INTO statblocks (world_id, campaign_id, name, description, config) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          data.world_id,
          data.campaign_id ?? null,
          name,
          data.description ?? null,
          data.config === undefined
            ? '{}'
            : ensureStatBlockConfigJsonText(data.config),
        );

      const statblock = db
        .prepare('SELECT * FROM statblocks WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!statblock) {
        throw new Error('Failed to create statblock');
      }
      return statblock;
    },
  );
}

function registerStatBlockUpdateHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.STATBLOCKS_UPDATE,
    (
      _event,
      id: number,
      data: { name?: string; description?: string | null; config?: string; },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasDescription = Object.prototype.hasOwnProperty.call(
        data,
        'description',
      );
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('StatBlock name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasDescription && data.description !== undefined) {
        setClauses.push('description = ?');
        values.push(data.description);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(ensureStatBlockConfigJsonText(data.config));
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE statblocks SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE statblocks SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const statblock = db.prepare('SELECT * FROM statblocks WHERE id = ?').get(id);
      if (!statblock) {
        throw new Error('StatBlock not found');
      }
      return statblock;
    },
  );
}

function registerStatBlockDeleteHandler(db: Database.Database): void {
  ipcMain.handle(IPC.STATBLOCKS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM statblocks WHERE id = ?').run(id);
    return { id };
  });
}

type StatBlockRelationDependencies = {
  getTokenByIdStmt: Database.Statement;
  getStatBlockByIdStmt: Database.Statement;
  getAbilityByIdStmt: Database.Statement;
};

function registerStatBlockTokenLinkHandlers(
  db: Database.Database,
  dependencies: StatBlockRelationDependencies,
): void {
  const { getTokenByIdStmt, getStatBlockByIdStmt } = dependencies;

  ipcMain.handle(
    IPC.STATBLOCKS_LINK_TOKEN,
    (_event, data: { statblock_id: number; token_id: number; }) => {
      const statblock = getStatBlockByIdStmt.get(data.statblock_id) as
        | StatBlock
        | undefined;
      if (!statblock) {
        throw new Error('StatBlock not found');
      }

      const token = getTokenByIdStmt.get(data.token_id) as Token | undefined;
      if (!token) {
        throw new Error('Token not found');
      }

      if (token.world_id !== statblock.world_id) {
        throw new Error('Token and StatBlock must belong to the same world');
      }

      try {
        db.prepare(
          'INSERT INTO statblock_token_links (statblock_id, token_id) VALUES (?, ?)',
        ).run(data.statblock_id, data.token_id);
      } catch (error) {
        if (isSqliteUniqueConstraintError(error)) {
          throw new Error('Token is already linked to a statblock');
        }
        throw error;
      }

      return data;
    },
  );

  registerStatBlockTokenUnlinkHandler(db);
  registerStatBlockGetLinkedTokenHandlers(db);
}

function registerStatBlockTokenUnlinkHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.STATBLOCKS_UNLINK_TOKEN,
    (_event, data: { statblock_id: number; token_id: number; }) => {
      db.prepare(
        'DELETE FROM statblock_token_links WHERE statblock_id = ? AND token_id = ?',
      ).run(data.statblock_id, data.token_id);
      return data;
    },
  );
}

function registerStatBlockGetLinkedTokenHandlers(db: Database.Database): void {
  ipcMain.handle(
    IPC.STATBLOCKS_GET_LINKED_TOKENS,
    (_event, statblockId: number): Token[] => {
      return db
        .prepare(
          `
          SELECT token.*
          FROM statblock_token_links AS link
          INNER JOIN tokens AS token ON token.id = link.token_id
          WHERE link.statblock_id = ?
          ORDER BY token.updated_at DESC, token.id DESC
          `,
        )
        .all(statblockId) as Token[];
    },
  );

  ipcMain.handle(
    IPC.STATBLOCKS_GET_LINKED_STATBLOCK,
    (_event, tokenId: number): StatBlock | null => {
      return (
        db
          .prepare(
            `
            SELECT statblock.*
            FROM statblock_token_links AS link
            INNER JOIN statblocks AS statblock ON statblock.id = link.statblock_id
            WHERE link.token_id = ?
            LIMIT 1
            `,
          )
          .get(tokenId) as StatBlock | undefined
      ) ?? null;
    },
  );
}

function registerStatBlockAbilityHandlers(
  db: Database.Database,
  dependencies: StatBlockRelationDependencies,
): void {
  const { getAbilityByIdStmt, getStatBlockByIdStmt } = dependencies;

  ipcMain.handle(
    IPC.STATBLOCKS_ATTACH_ABILITY,
    (_event, data: { statblock_id: number; ability_id: number; }) => {
      const statblock = getStatBlockByIdStmt.get(data.statblock_id) as
        | StatBlock
        | undefined;
      if (!statblock) {
        throw new Error('StatBlock not found');
      }

      const ability = getAbilityByIdStmt.get(data.ability_id) as
        | Ability
        | undefined;
      if (!ability) {
        throw new Error('Ability not found');
      }

      if (ability.world_id !== statblock.world_id) {
        throw new Error('Ability and StatBlock must belong to the same world');
      }

      try {
        db.prepare(
          'INSERT INTO statblock_ability_assignments (statblock_id, ability_id) VALUES (?, ?)',
        ).run(data.statblock_id, data.ability_id);
      } catch (error) {
        if (isSqliteUniqueConstraintError(error)) {
          throw new Error('Ability is already attached to statblock');
        }
        throw error;
      }

      return data;
    },
  );

  ipcMain.handle(
    IPC.STATBLOCKS_DETACH_ABILITY,
    (_event, data: { statblock_id: number; ability_id: number; }) => {
      db.prepare(
        'DELETE FROM statblock_ability_assignments WHERE statblock_id = ? AND ability_id = ?',
      ).run(data.statblock_id, data.ability_id);
      return data;
    },
  );

  ipcMain.handle(
    IPC.STATBLOCKS_LIST_ABILITIES,
    (_event, statblockId: number): Ability[] => {
      return db
        .prepare(
          `
          SELECT ability.*
          FROM statblock_ability_assignments AS assignment
          INNER JOIN abilities AS ability ON ability.id = assignment.ability_id
          WHERE assignment.statblock_id = ?
          ORDER BY ability.updated_at DESC, ability.id DESC
          `,
        )
        .all(statblockId) as Ability[];
    },
  );
}

export function registerStatBlockHandlers(db: Database.Database): void {
  registerStatBlockReadHandlers(db);
  registerStatBlockAddHandler(db);
  registerStatBlockUpdateHandler(db);
  registerStatBlockDeleteHandler(db);

  const dependencies = {
    getTokenByIdStmt: db.prepare('SELECT * FROM tokens WHERE id = ?'),
    getStatBlockByIdStmt: db.prepare('SELECT * FROM statblocks WHERE id = ?'),
    getAbilityByIdStmt: db.prepare('SELECT * FROM abilities WHERE id = ?'),
  };

  registerStatBlockTokenLinkHandlers(db, dependencies);
  registerStatBlockAbilityHandlers(db, dependencies);
}
