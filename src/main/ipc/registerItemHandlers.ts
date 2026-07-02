/**
 * @role Item IPC registrar
 * @owns Item CRUD and image import channel handlers
 * @seam Main-process adapter for item IPC requests
 * @calls SQLite statements, filesystem persistence, and shared image validation
 */
import type Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { IPC } from '../../shared/ipcChannels';

const ITEM_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const ITEM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ITEM_IMAGE_PROTOCOL = 'vv-media';
const ITEM_IMAGE_HOST = 'item-images';

type ItemUpsertData = {
  world_id?: number;
  name?: string;
  description?: string | null;
  image_src?: string | null;
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function registerItemReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.ITEMS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare('SELECT * FROM items WHERE world_id = ? ORDER BY updated_at DESC')
      .all(worldId);
  });

  ipcMain.handle(IPC.ITEMS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM items WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(IPC.ITEMS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE items SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM items WHERE id = ?').get(id) ?? null;
  });
}

function registerItemMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.ITEMS_ADD, (_event, data: ItemUpsertData) => {
    const worldId = typeof data.world_id === 'number' ? data.world_id : null;
    if (!worldId) {
      throw new Error('Item world_id is required');
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Item name is required');
    }

    const description = normalizeOptionalText(data.description);
    const imageSrc = normalizeOptionalText(data.image_src);

    const stmt = db.prepare(
      'INSERT INTO items (world_id, name, description, image_src) VALUES (?, ?, ?, ?)',
    );
    const result = stmt.run(worldId, name, description, imageSrc);

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    if (!item) {
      throw new Error('Failed to create item');
    }
    return item;
  });

  ipcMain.handle(IPC.ITEMS_UPDATE, (_event, id: number, data: ItemUpsertData) => {
    const existingItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as
      | Item
      | undefined;
    if (!existingItem) {
      throw new Error('Item not found');
    }

    const setClauses: string[] = [];
    const values: Array<string | number | null> = [];

    if (Object.prototype.hasOwnProperty.call(data, 'name')) {
      const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
      if (!trimmedName) {
        throw new Error('Item name is required');
      }
      setClauses.push('name = ?');
      values.push(trimmedName);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'description')) {
      setClauses.push('description = ?');
      values.push(normalizeOptionalText(data.description));
    }

    if (Object.prototype.hasOwnProperty.call(data, 'image_src')) {
      setClauses.push('image_src = ?');
      values.push(normalizeOptionalText(data.image_src));
    }

    const updateSql = setClauses.length > 0
      ? `UPDATE items SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE items SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  });

  ipcMain.handle(IPC.ITEMS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM items WHERE id = ?').run(id);
    return { id };
  });
}

function registerItemImageImportHandler(): void {
  ipcMain.handle(
    IPC.ITEMS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureItemImageImportPayload(payload);

      const itemImagesDir = itemImagesDirectoryPath();
      await mkdir(itemImagesDir, { recursive: true });

      const extension = ITEM_IMAGE_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        throw new Error('Unsupported item image mimeType');
      }

      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(itemImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildItemImageMediaUrl(uniqueFileName),
      };
    },
  );
}

function ensureItemImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof ITEM_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Item image fileName is required');
  }

  const mimeType = typeof payload.mimeType === 'string'
    ? payload.mimeType.trim().toLowerCase()
    : '';
  if (!Object.prototype.hasOwnProperty.call(ITEM_IMAGE_MIME_TO_EXTENSION, mimeType)) {
    throw new Error(
      'Unsupported item image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Item image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Item image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > ITEM_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Item image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof ITEM_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function itemImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'item-images');
}

function buildItemImageMediaUrl(fileName: string): string {
  return `${ITEM_IMAGE_PROTOCOL}://${ITEM_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

export function registerItemHandlers(db: Database.Database): void {
  registerItemReadHandlers(db);
  registerItemMutationHandlers(db);
  registerItemImageImportHandler();
}
