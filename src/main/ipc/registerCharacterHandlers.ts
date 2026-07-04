/**
 * @role Character IPC registrar
 * @owns Character CRUD and image import channel handlers
 * @seam Main-process adapter for character IPC requests
 * @calls SQLite statements, filesystem persistence, and shared image validation
 */
import type Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import type {
  CharacterSearchByWorldQuery,
  CharacterSearchByWorldResult,
} from '../../shared/contracts/dbApiPayloads';
import { IPC } from '../../shared/ipcChannels';
import { normalizeMediaImageSrcForHost } from '../../shared/media/imageSource';
import { normalizeOptionalJsonText } from './validation';

const CHARACTER_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const CHARACTER_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CHARACTER_IMAGE_PROTOCOL = 'vv-media';
const CHARACTER_IMAGE_HOST = 'character-images';

type CharacterUpsertData = {
  world_id?: number;
  name?: string;
  profile?: string | null;
  is_player_character?: number;
  owner?: string | null;
  author?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  sections?: string;
  wiki_summary?: string;
};

function normalizePlayerCharacterFlag(value: number | undefined): 0 | 1 {
  return value === 1 ? 1 : 0;
}

function normalizeCharacterOwner(value: string | null | undefined): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

function ensurePlayerCharacterOwner(
  isPlayerCharacter: 0 | 1,
  owner: string | null,
): string | null {
  if (isPlayerCharacter === 1 && !owner) {
    throw new Error('Character owner is required for player characters');
  }

  return isPlayerCharacter === 1 ? owner : null;
}

function registerCharacterReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.CHARACTERS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare('SELECT * FROM characters WHERE world_id = ? ORDER BY updated_at DESC')
      .all(worldId);
  });

  ipcMain.handle(IPC.CHARACTERS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM characters WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(IPC.CHARACTERS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE characters SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM characters WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.CHARACTERS_SEARCH_BY_WORLD,
    (_event, query: CharacterSearchByWorldQuery): CharacterSearchByWorldResult => {
      return searchCharactersByWorld(db, query);
    },
  );
}

function searchCharactersByWorld(
  db: Database.Database,
  query: CharacterSearchByWorldQuery,
): CharacterSearchByWorldResult {
  const trimmedQuery = typeof query.query === 'string' ? query.query.trim() : '';
  const limit = Number.isInteger(query.limit) && query.limit > 0 ? query.limit : 50;
  const offset = Number.isInteger(query.offset) && query.offset >= 0 ? query.offset : 0;
  const excludeIds = Array.isArray(query.excludeCharacterIds)
    ? query.excludeCharacterIds.filter((id): id is number => Number.isInteger(id))
    : [];

  const excludeClause = excludeIds.length > 0
    ? `AND id NOT IN (${excludeIds.map(() => '?').join(', ')})`
    : '';

  const rows = db
    .prepare(
      `SELECT * FROM characters
       WHERE world_id = ? AND name LIKE ? COLLATE NOCASE ${excludeClause}
       ORDER BY name COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
    )
    .all(query.worldId, `${trimmedQuery}%`, ...excludeIds, limit + 1, offset) as Character[];

  const hasMore = rows.length > limit;
  return { items: rows.slice(0, limit), hasMore };
}

function registerCharacterMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.CHARACTERS_ADD, (_event, data: CharacterUpsertData) => {
    const worldId = typeof data.world_id === 'number' ? data.world_id : null;
    if (!worldId) {
      throw new Error('Character world_id is required');
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Character name is required');
    }

    const profile = typeof data.profile === 'string' ? data.profile : null;
    const isPlayerCharacter = normalizePlayerCharacterFlag(data.is_player_character);
    const owner = ensurePlayerCharacterOwner(
      isPlayerCharacter,
      normalizeCharacterOwner(data.owner),
    );
    const author = typeof data.author === 'string' ? data.author.trim() || null : null;
    const imageSrc = normalizeMediaImageSrcForHost(data.image_src, CHARACTER_IMAGE_HOST);
    const originalImageSrc = normalizeMediaImageSrcForHost(
      data.original_image_src,
      CHARACTER_IMAGE_HOST,
    );
    const imageCrop = normalizeOptionalJsonText(data.image_crop, 'Character image_crop');
    const sections = ensureCharacterJson(data.sections, 'sections');
    const wikiSummary = ensureCharacterJson(data.wiki_summary, 'wiki_summary');

    const stmt = db.prepare(
      'INSERT INTO characters (world_id, name, profile, is_player_character, owner, author, image_src, original_image_src, image_crop, sections, wiki_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const result = stmt.run(
      worldId,
      name,
      profile,
      isPlayerCharacter,
      owner,
      author,
      imageSrc,
      originalImageSrc,
      imageCrop,
      sections,
      wikiSummary,
    );

    const character = db
      .prepare('SELECT * FROM characters WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!character) {
      throw new Error('Failed to create character');
    }
    return character;
  });

  ipcMain.handle(IPC.CHARACTERS_UPDATE, (_event, id: number, data: CharacterUpsertData) => {
    const existingCharacter = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as
      | Character
      | undefined;
    if (!existingCharacter) {
      throw new Error('Character not found');
    }

    const { setClauses, values } = buildCharacterUpdateStatement(data, existingCharacter);

    const updateSql = setClauses.length > 0
      ? `UPDATE characters SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE characters SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!character) {
      throw new Error('Character not found');
    }
    return character;
  });

  ipcMain.handle(IPC.CHARACTERS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM characters WHERE id = ?').run(id);
    return { id };
  });
}

function registerCharacterImageImportHandler(): void {
  ipcMain.handle(
    IPC.CHARACTERS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureCharacterImageImportPayload(payload);

      const characterImagesDir = characterImagesDirectoryPath();
      await mkdir(characterImagesDir, { recursive: true });

      const extension = CHARACTER_IMAGE_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        throw new Error('Unsupported character image mimeType');
      }

      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(characterImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildCharacterImageMediaUrl(uniqueFileName),
      };
    },
  );
}

function ensureCharacterImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof CHARACTER_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Character image fileName is required');
  }

  const mimeType = typeof payload.mimeType === 'string'
    ? payload.mimeType.trim().toLowerCase()
    : '';
  if (
    !Object.prototype.hasOwnProperty.call(
      CHARACTER_IMAGE_MIME_TO_EXTENSION,
      mimeType,
    )
  ) {
    throw new Error(
      'Unsupported character image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Character image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Character image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > CHARACTER_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Character image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof CHARACTER_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function characterImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'character-images');
}

function buildCharacterImageMediaUrl(fileName: string): string {
  return `${CHARACTER_IMAGE_PROTOCOL}://${CHARACTER_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

function ensureCharacterJson(
  value: string | undefined,
  fieldName: 'sections' | 'wiki_summary',
): string {
  if (typeof value !== 'string') {
    return '{}';
  }
  try {
    JSON.parse(value);
  } catch {
    throw new Error(`Character ${fieldName} must be valid JSON`);
  }
  return value;
}

function hasOwnCharacterField<Key extends keyof CharacterUpsertData>(
  data: CharacterUpsertData,
  key: Key,
): boolean {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function pushCharacterUpdate(
  setClauses: string[],
  values: Array<string | number | null>,
  clause: string,
  value: string | number | null,
): void {
  setClauses.push(clause);
  values.push(value);
}

function appendOptionalTrimmedNameUpdate(
  data: CharacterUpsertData,
  setClauses: string[],
  values: Array<string | number | null>,
): void {
  if (!hasOwnCharacterField(data, 'name')) {
    return;
  }

  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Character name is required');
  }

  pushCharacterUpdate(setClauses, values, 'name = ?', trimmedName);
}

function appendOptionalNullableStringUpdate(
  data: CharacterUpsertData,
  key: 'profile' | 'author' | 'image_src' | 'original_image_src',
  clause: string,
  normalize: (
    value: CharacterUpsertData['profile' | 'author' | 'image_src' | 'original_image_src'],
  ) => string | null,
  setClauses: string[],
  values: Array<string | number | null>,
): void {
  if (!hasOwnCharacterField(data, key)) {
    return;
  }

  pushCharacterUpdate(setClauses, values, clause, normalize(data[key]));
}

function appendOptionalCharacterJsonUpdate(
  data: CharacterUpsertData,
  key: 'sections' | 'wiki_summary',
  clause: string,
  setClauses: string[],
  values: Array<string | number | null>,
): void {
  if (!hasOwnCharacterField(data, key)) {
    return;
  }

  pushCharacterUpdate(setClauses, values, clause, ensureCharacterJson(data[key], key));
}

function buildCharacterUpdateStatement(
  data: CharacterUpsertData,
  existingCharacter: Character,
): {
  setClauses: string[];
  values: Array<string | number | null>;
} {
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  appendOptionalTrimmedNameUpdate(data, setClauses, values);
  appendOptionalNullableStringUpdate(
    data,
    'profile',
    'profile = ?',
    (value) => typeof value === 'string' ? value : null,
    setClauses,
    values,
  );

  const hasPlayerCharacterFlag = hasOwnCharacterField(data, 'is_player_character');
  const hasOwner = hasOwnCharacterField(data, 'owner');
  const nextIsPlayerCharacter = hasPlayerCharacterFlag
    ? normalizePlayerCharacterFlag(data.is_player_character)
    : normalizePlayerCharacterFlag(existingCharacter.is_player_character);
  const requestedOwner = hasOwner
    ? normalizeCharacterOwner(data.owner)
    : normalizeCharacterOwner(existingCharacter.owner);
  const nextOwner = ensurePlayerCharacterOwner(nextIsPlayerCharacter, requestedOwner);

  if (hasPlayerCharacterFlag) {
    pushCharacterUpdate(setClauses, values, 'is_player_character = ?', nextIsPlayerCharacter);
  }

  if (hasOwner || (hasPlayerCharacterFlag && nextIsPlayerCharacter === 0)) {
    pushCharacterUpdate(setClauses, values, 'owner = ?', nextOwner);
  }

  appendOptionalNullableStringUpdate(
    data,
    'author',
    'author = ?',
    (value) => typeof value === 'string' ? value.trim() || null : null,
    setClauses,
    values,
  );
  appendOptionalNullableStringUpdate(
    data,
    'image_src',
    'image_src = ?',
    (value) => normalizeMediaImageSrcForHost(value, CHARACTER_IMAGE_HOST),
    setClauses,
    values,
  );
  appendOptionalNullableStringUpdate(
    data,
    'original_image_src',
    'original_image_src = ?',
    (value) => normalizeMediaImageSrcForHost(value, CHARACTER_IMAGE_HOST),
    setClauses,
    values,
  );
  if (hasOwnCharacterField(data, 'image_crop')) {
    pushCharacterUpdate(
      setClauses,
      values,
      'image_crop = ?',
      normalizeOptionalJsonText(data.image_crop, 'Character image_crop'),
    );
  }
  appendOptionalCharacterJsonUpdate(data, 'sections', 'sections = ?', setClauses, values);
  appendOptionalCharacterJsonUpdate(data, 'wiki_summary', 'wiki_summary = ?', setClauses, values);

  return { setClauses, values };
}

export function registerCharacterHandlers(
  db: Database.Database,
): void {
  registerCharacterReadHandlers(db);
  registerCharacterMutationHandlers(db);
  registerCharacterImageImportHandler();
}
