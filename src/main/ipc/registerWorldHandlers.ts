/**
 * @role World IPC registrar
 * @owns World CRUD, viewed-state, and image import channel handlers
 * @seam Main-process adapter for world IPC requests
 * @calls SQLite statements, filesystem persistence, and shared image validation
 */
import type Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { IPC } from '../../shared/ipcChannels';
import { normalizeMediaImageSrcForHost } from '../../shared/media/imageSource';
import { getDefaultWorldConfig } from '../../shared/statisticsTypes';
import { normalizeOptionalJsonText } from './validation';

const TOKEN_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const TOKEN_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TOKEN_IMAGE_PROTOCOL = 'vv-media';
const WORLD_IMAGE_HOST = 'world-images';

type WorldUpsertData = {
  name?: string;
  thumbnail?: string | null;
  original_thumbnail_src?: string | null;
  thumbnail_crop?: string | null;
  short_description?: string | null;
  config?: string;
};

function registerWorldReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.WORLDS_GET_ALL, () => {
    return db.prepare('SELECT * FROM worlds ORDER BY updated_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });
}

interface WorldHandlerDeps {
  cleanupDeletedWorld?(worldId: number): Promise<void>;
}

function registerWorldMutationHandlers(
  db: Database.Database,
  deps: WorldHandlerDeps,
): void {
  ipcMain.handle(IPC.WORLDS_ADD, (_event, data: WorldUpsertData) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('World name is required');
    }

    const thumbnail = normalizeMediaImageSrcForHost(data.thumbnail, WORLD_IMAGE_HOST);
    const originalThumbnailSrc = normalizeMediaImageSrcForHost(
      data.original_thumbnail_src,
      WORLD_IMAGE_HOST,
    );
    const thumbnailCrop = normalizeOptionalJsonText(
      data.thumbnail_crop,
      'World thumbnail_crop',
    );
    const shortDescription = typeof data.short_description === 'string'
      ? data.short_description
      : null;

    const config = ensureWorldConfigJson(data.config);

    const stmt = db.prepare(
      'INSERT INTO worlds (name, thumbnail, original_thumbnail_src, thumbnail_crop, short_description, config) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const result = stmt.run(
      name,
      thumbnail,
      originalThumbnailSrc,
      thumbnailCrop,
      shortDescription,
      config,
    );

    const world = db
      .prepare('SELECT * FROM worlds WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!world) {
      throw new Error('Failed to create world');
    }
    return world;
  });

  ipcMain.handle(IPC.WORLDS_UPDATE, (_event, id: number, data: WorldUpsertData) => {
    const { setClauses, values } = buildWorldUpdateStatement(data);

    const updateSql = setClauses.length > 0
      ? `UPDATE worlds SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE worlds SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    const world = db.prepare('SELECT * FROM worlds WHERE id = ?').get(id);
    if (!world) {
      throw new Error('World not found');
    }
    return world;
  });

  ipcMain.handle(IPC.WORLDS_DELETE, async (_event, id: number) => {
    await deps.cleanupDeletedWorld?.(id);
    db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.WORLDS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE worlds SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });
}

function registerWorldImageImportHandler(): void {
  ipcMain.handle(
    IPC.WORLDS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureTokenImageImportPayload(payload);

      const worldImagesDir = worldImagesDirectoryPath();
      await mkdir(worldImagesDir, { recursive: true });

      const extension = TOKEN_IMAGE_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        throw new Error('Unsupported world image mimeType');
      }

      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(worldImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildWorldImageMediaUrl(uniqueFileName),
      };
    },
  );
}

function ensureTokenImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof TOKEN_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Token image fileName is required');
  }

  const mimeType = typeof payload.mimeType === 'string'
    ? payload.mimeType.trim().toLowerCase()
    : '';
  if (
    !Object.prototype.hasOwnProperty.call(
      TOKEN_IMAGE_MIME_TO_EXTENSION,
      mimeType,
    )
  ) {
    throw new Error(
      'Unsupported token image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Token image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Token image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > TOKEN_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Token image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof TOKEN_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function worldImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'world-images');
}

function buildWorldImageMediaUrl(fileName: string): string {
  return `${TOKEN_IMAGE_PROTOCOL}://${WORLD_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

function ensureWorldConfigJson(config: string | undefined): string {
  if (typeof config === 'string') {
    try {
      JSON.parse(config);
    } catch {
      throw new Error('World config must be valid JSON');
    }
    return config;
  }

  return JSON.stringify(getDefaultWorldConfig());
}

function buildWorldUpdateStatement(data: WorldUpsertData): {
  setClauses: string[];
  values: Array<string | null>;
} {
  const setClauses: string[] = [];
  const values: Array<string | null> = [];

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
    if (!trimmedName) {
      throw new Error('World name is required');
    }
    setClauses.push('name = ?');
    values.push(trimmedName);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'thumbnail')) {
    setClauses.push('thumbnail = ?');
    values.push(normalizeMediaImageSrcForHost(data.thumbnail, WORLD_IMAGE_HOST));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'original_thumbnail_src')) {
    setClauses.push('original_thumbnail_src = ?');
    values.push(
      normalizeMediaImageSrcForHost(data.original_thumbnail_src, WORLD_IMAGE_HOST),
    );
  }

  if (Object.prototype.hasOwnProperty.call(data, 'thumbnail_crop')) {
    setClauses.push('thumbnail_crop = ?');
    values.push(normalizeOptionalJsonText(data.thumbnail_crop, 'World thumbnail_crop'));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'short_description')) {
    setClauses.push('short_description = ?');
    values.push(
      typeof data.short_description === 'string'
        ? data.short_description
        : null,
    );
  }

  if (Object.prototype.hasOwnProperty.call(data, 'config')) {
    const config = typeof data.config === 'string' ? data.config : '{}';
    try {
      JSON.parse(config);
    } catch {
      throw new Error('World config must be valid JSON');
    }
    setClauses.push('config = ?');
    values.push(config);
  }

  return { setClauses, values };
}

export function registerWorldHandlers(
  db: Database.Database,
  deps: WorldHandlerDeps = {},
): void {
  registerWorldReadHandlers(db);
  registerWorldMutationHandlers(db, deps);
  registerWorldImageImportHandler();
}
