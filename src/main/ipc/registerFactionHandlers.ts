/**
 * @role Faction IPC registrar
 * @owns Faction CRUD and image import channel handlers
 * @seam Main-process adapter for faction IPC requests
 * @calls SQLite statements, filesystem persistence, and shared faction hierarchy validation
 */
import type Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { wouldCreateCycle } from '../../shared/factionHierarchy';
import { IPC } from '../../shared/ipcChannels';

const FACTION_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const FACTION_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const FACTION_IMAGE_PROTOCOL = 'vv-media';
const FACTION_IMAGE_HOST = 'faction-images';

type FactionUpsertData = {
  world_id?: number;
  name?: string;
  profile?: string | null;
  image_src?: string | null;
  sections?: string;
  wiki_summary?: string;
  type_id?: number | null;
  parent_faction_id?: number | null;
};

function registerFactionReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.FACTIONS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare('SELECT * FROM factions WHERE world_id = ? ORDER BY updated_at DESC')
      .all(worldId);
  });

  ipcMain.handle(IPC.FACTIONS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM factions WHERE id = ?').get(id) ?? null;
  });
}

function ensureCycleFree(
  db: Database.Database,
  factionId: number,
  candidateParentId: number,
): void {
  const currentFaction = db
    .prepare('SELECT world_id FROM factions WHERE id = ?')
    .get(factionId) as { world_id: number; } | undefined;
  if (!currentFaction) {
    return;
  }

  const allFactions = db
    .prepare('SELECT id, parent_faction_id FROM factions WHERE world_id = ?')
    .all(currentFaction.world_id) as Array<{ id: number; parent_faction_id: number | null; }>;

  if (wouldCreateCycle(factionId, candidateParentId, allFactions)) {
    throw new Error('A faction cannot be its own ancestor.');
  }
}

function registerFactionMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.FACTIONS_ADD, (_event, data: FactionUpsertData) => {
    const worldId = typeof data.world_id === 'number' ? data.world_id : null;
    if (!worldId) {
      throw new Error('Faction world_id is required');
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Faction name is required');
    }

    const profile = typeof data.profile === 'string' ? data.profile : null;
    const imageSrc = typeof data.image_src === 'string' ? data.image_src : null;
    const sections = ensureFactionJson(data.sections, 'sections');
    const wikiSummary = ensureFactionJson(data.wiki_summary, 'wiki_summary');
    const typeId = typeof data.type_id === 'number' ? data.type_id : null;
    const parentFactionId = typeof data.parent_faction_id === 'number'
      ? data.parent_faction_id
      : null;

    const stmt = db.prepare(
      'INSERT INTO factions (world_id, name, profile, image_src, sections, wiki_summary, type_id, parent_faction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const result = stmt.run(
      worldId,
      name,
      profile,
      imageSrc,
      sections,
      wikiSummary,
      typeId,
      parentFactionId,
    );

    const faction = db
      .prepare('SELECT * FROM factions WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!faction) {
      throw new Error('Failed to create faction');
    }
    return faction;
  });

  ipcMain.handle(IPC.FACTIONS_UPDATE, (_event, id: number, data: FactionUpsertData) => {
    if (
      Object.prototype.hasOwnProperty.call(data, 'parent_faction_id')
      && typeof data.parent_faction_id === 'number'
    ) {
      ensureCycleFree(db, id, data.parent_faction_id);
    }

    const { setClauses, values } = buildFactionUpdateStatement(data);

    const updateSql = setClauses.length > 0
      ? `UPDATE factions SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE factions SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    const faction = db.prepare('SELECT * FROM factions WHERE id = ?').get(id);
    if (!faction) {
      throw new Error('Faction not found');
    }
    return faction;
  });

  ipcMain.handle(IPC.FACTIONS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM factions WHERE id = ?').run(id);
    return { id };
  });
}

function registerFactionImageImportHandler(): void {
  ipcMain.handle(
    IPC.FACTIONS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureFactionImageImportPayload(payload);

      const factionImagesDir = factionImagesDirectoryPath();
      await mkdir(factionImagesDir, { recursive: true });

      const extension = FACTION_IMAGE_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        throw new Error('Unsupported faction image mimeType');
      }

      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(factionImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildFactionImageMediaUrl(uniqueFileName),
      };
    },
  );
}

function ensureFactionImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof FACTION_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Faction image fileName is required');
  }

  const mimeType = typeof payload.mimeType === 'string'
    ? payload.mimeType.trim().toLowerCase()
    : '';
  if (
    !Object.prototype.hasOwnProperty.call(
      FACTION_IMAGE_MIME_TO_EXTENSION,
      mimeType,
    )
  ) {
    throw new Error(
      'Unsupported faction image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Faction image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Faction image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > FACTION_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Faction image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof FACTION_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function factionImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'faction-images');
}

function buildFactionImageMediaUrl(fileName: string): string {
  return `${FACTION_IMAGE_PROTOCOL}://${FACTION_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

function ensureFactionJson(
  value: string | undefined,
  fieldName: 'sections' | 'wiki_summary',
): string {
  if (typeof value !== 'string') {
    return '{}';
  }
  try {
    JSON.parse(value);
  } catch {
    throw new Error(`Faction ${fieldName} must be valid JSON`);
  }
  return value;
}

function buildFactionUpdateStatement(data: FactionUpsertData): {
  setClauses: string[];
  values: Array<string | number | null>;
} {
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
    if (!trimmedName) {
      throw new Error('Faction name is required');
    }
    setClauses.push('name = ?');
    values.push(trimmedName);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'profile')) {
    setClauses.push('profile = ?');
    values.push(typeof data.profile === 'string' ? data.profile : null);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'image_src')) {
    setClauses.push('image_src = ?');
    values.push(typeof data.image_src === 'string' ? data.image_src : null);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'sections')) {
    setClauses.push('sections = ?');
    values.push(ensureFactionJson(data.sections, 'sections'));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'wiki_summary')) {
    setClauses.push('wiki_summary = ?');
    values.push(ensureFactionJson(data.wiki_summary, 'wiki_summary'));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'type_id')) {
    setClauses.push('type_id = ?');
    values.push(typeof data.type_id === 'number' ? data.type_id : null);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'parent_faction_id')) {
    setClauses.push('parent_faction_id = ?');
    values.push(typeof data.parent_faction_id === 'number' ? data.parent_faction_id : null);
  }

  return { setClauses, values };
}

export function registerFactionHandlers(
  db: Database.Database,
): void {
  registerFactionReadHandlers(db);
  registerFactionMutationHandlers(db);
  registerFactionImageImportHandler();
}
