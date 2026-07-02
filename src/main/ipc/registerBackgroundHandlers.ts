/**
 * @role Background IPC registrar
 * @owns Background CRUD and image import channel handlers
 * @seam Main-process adapter for background IPC requests
 * @calls SQLite statements, filesystem persistence, and shared image validation
 */
import type Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { IPC } from '../../shared/ipcChannels';
import { normalizeMediaImageSrcForHost } from '../../shared/media/imageSource';

const BACKGROUND_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const BACKGROUND_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const BACKGROUND_IMAGE_PROTOCOL = 'vv-media';
const BACKGROUND_IMAGE_HOST = 'background-images';

type BackgroundUpsertData = {
  world_id?: number;
  name?: string;
  description?: string | null;
  image_src?: string | null;
};

function registerBackgroundReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.BACKGROUNDS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare('SELECT * FROM backgrounds WHERE world_id = ? ORDER BY updated_at DESC')
      .all(worldId);
  });

  ipcMain.handle(IPC.BACKGROUNDS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(IPC.BACKGROUNDS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE backgrounds SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(id) ?? null;
  });
}

function registerBackgroundMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.BACKGROUNDS_ADD, (_event, data: BackgroundUpsertData) => {
    const worldId = typeof data.world_id === 'number' ? data.world_id : null;
    if (!worldId) {
      throw new Error('Background world_id is required');
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Background name is required');
    }

    const description = typeof data.description === 'string' ? data.description : null;
    const imageSrc = normalizeMediaImageSrcForHost(data.image_src, BACKGROUND_IMAGE_HOST);

    const stmt = db.prepare(
      'INSERT INTO backgrounds (world_id, name, description, image_src) VALUES (?, ?, ?, ?)',
    );
    const result = stmt.run(worldId, name, description, imageSrc);

    const background = db
      .prepare('SELECT * FROM backgrounds WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!background) {
      throw new Error('Failed to create background');
    }
    return background;
  });

  ipcMain.handle(IPC.BACKGROUNDS_UPDATE, (_event, id: number, data: BackgroundUpsertData) => {
    const existingBackground = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(id) as
      | Background
      | undefined;
    if (!existingBackground) {
      throw new Error('Background not found');
    }

    const setClauses: string[] = [];
    const values: Array<string | number | null> = [];

    if (Object.prototype.hasOwnProperty.call(data, 'name')) {
      const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
      if (!trimmedName) {
        throw new Error('Background name is required');
      }
      setClauses.push('name = ?');
      values.push(trimmedName);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'description')) {
      setClauses.push('description = ?');
      values.push(typeof data.description === 'string' ? data.description : null);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'image_src')) {
      setClauses.push('image_src = ?');
      values.push(
        normalizeMediaImageSrcForHost(data.image_src, BACKGROUND_IMAGE_HOST),
      );
    }

    const updateSql = setClauses.length > 0
      ? `UPDATE backgrounds SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE backgrounds SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    const background = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(id);
    if (!background) {
      throw new Error('Background not found');
    }
    return background;
  });

  ipcMain.handle(IPC.BACKGROUNDS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM backgrounds WHERE id = ?').run(id);
    return { id };
  });
}

function registerBackgroundImageImportHandler(): void {
  ipcMain.handle(
    IPC.BACKGROUNDS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureBackgroundImageImportPayload(payload);

      const backgroundImagesDir = backgroundImagesDirectoryPath();
      await mkdir(backgroundImagesDir, { recursive: true });

      const extension = BACKGROUND_IMAGE_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        throw new Error('Unsupported background image mimeType');
      }

      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(backgroundImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildBackgroundImageMediaUrl(uniqueFileName),
      };
    },
  );
}

function ensureBackgroundImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof BACKGROUND_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Background image fileName is required');
  }

  const mimeType = typeof payload.mimeType === 'string'
    ? payload.mimeType.trim().toLowerCase()
    : '';
  if (
    !Object.prototype.hasOwnProperty.call(
      BACKGROUND_IMAGE_MIME_TO_EXTENSION,
      mimeType,
    )
  ) {
    throw new Error(
      'Unsupported background image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Background image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Background image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > BACKGROUND_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Background image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof BACKGROUND_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function backgroundImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'background-images');
}

function buildBackgroundImageMediaUrl(fileName: string): string {
  return `${BACKGROUND_IMAGE_PROTOCOL}://${BACKGROUND_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

export function registerBackgroundHandlers(
  db: Database.Database,
): void {
  registerBackgroundReadHandlers(db);
  registerBackgroundMutationHandlers(db);
  registerBackgroundImageImportHandler();
}
