import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { db as dbHandlers, ensureTokenConfigJsonText } from '../../database/db';
import { IPC } from '../../shared/ipcChannels';
import { ensureSqliteBooleanNumber } from './validation';

const TOKEN_GRID_TYPES = new Set(['square', 'hex']);
const TOKEN_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const TOKEN_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TOKEN_IMAGE_PROTOCOL = 'vv-media';
const TOKEN_IMAGE_HOST = 'token-images';

type RegisterTokenHandlersDependencies = {
  userDataPath: string;
};

type TokenUpsertData = {
  world_id: number;
  campaign_id?: number | null;
  name?: string;
  image_src?: string | null;
  config?: string;
  grid_type?: TokenGridType;
  is_visible?: number;
};

function ensureTokenGridType(
  value: unknown,
  fieldName = 'grid_type',
): TokenGridType {
  if (typeof value !== 'string' || !TOKEN_GRID_TYPES.has(value)) {
    throw new Error(`${fieldName} must be 'square' or 'hex'`);
  }
  return value as TokenGridType;
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

function tokenImagesDirectoryPath(userDataPath: string): string {
  return path.join(userDataPath, 'token-images');
}

function buildTokenImageMediaUrl(fileName: string): string {
  return `${TOKEN_IMAGE_PROTOCOL}://${TOKEN_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

function registerTokenReadHandlers(db: Database.Database): void {
  ipcMain.handle(
    IPC.TOKENS_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number): Token[] => {
      return db
        .prepare(
          'SELECT * FROM tokens WHERE campaign_id = ? ORDER BY updated_at DESC, id DESC',
        )
        .all(campaignId) as Token[];
    },
  );

  ipcMain.handle(
    IPC.TOKENS_GET_ALL_BY_WORLD,
    (_event, worldId: number): Token[] => {
      if (!Number.isInteger(worldId) || worldId <= 0) {
        throw new Error('Invalid worldId');
      }
      return db
        .prepare('SELECT * FROM tokens WHERE world_id = ? ORDER BY name ASC')
        .all(worldId) as Token[];
    },
  );

  ipcMain.handle(IPC.TOKENS_GET_BY_ID, (_event, id: number): Token | null => {
    return (db.prepare('SELECT * FROM tokens WHERE id = ?').get(id) as Token | undefined) ?? null;
  });
}

function registerTokenAddHandler(db: Database.Database): void {
  ipcMain.handle(IPC.TOKENS_ADD, (_event, data: TokenUpsertData): Token => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Token name is required');
    }
    if (!Number.isInteger(data.world_id) || data.world_id <= 0) {
      throw new Error('Invalid world_id');
    }
    if (
      data.campaign_id != null
      && (!Number.isInteger(data.campaign_id) || data.campaign_id <= 0)
    ) {
      throw new Error('Invalid campaign_id');
    }

    const config = data.config === undefined
      ? '{}'
      : ensureTokenConfigJsonText(data.config);
    const gridType = data.grid_type === undefined
      ? 'square'
      : ensureTokenGridType(data.grid_type);
    const isVisible = data.is_visible === undefined
      ? 1
      : ensureSqliteBooleanNumber(data.is_visible, 'Token visibility');
    const campaignId = data.campaign_id ?? null;

    const result = db
      .prepare(
        'INSERT INTO tokens (world_id, campaign_id, name, image_src, config, grid_type, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        data.world_id,
        campaignId,
        name,
        data.image_src ?? null,
        config,
        gridType,
        isVisible,
      );

    const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid) as
      | Token
      | undefined;
    if (!token) {
      throw new Error('Failed to create token');
    }
    return token;
  });
}

function registerTokenUpdateHandler(db: Database.Database): void {
  ipcMain.handle(
    IPC.TOKENS_UPDATE,
    (_event, id: number, data: Omit<TokenUpsertData, 'world_id' | 'campaign_id'>): Token => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasImageSrc = Object.prototype.hasOwnProperty.call(data, 'image_src');
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');
      const hasGridType = Object.prototype.hasOwnProperty.call(data, 'grid_type');
      const hasIsVisible = Object.prototype.hasOwnProperty.call(data, 'is_visible');

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Token name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasImageSrc && data.image_src !== undefined) {
        setClauses.push('image_src = ?');
        values.push(data.image_src);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(ensureTokenConfigJsonText(data.config));
      }

      if (hasGridType && data.grid_type !== undefined) {
        setClauses.push('grid_type = ?');
        values.push(ensureTokenGridType(data.grid_type));
      }

      if (hasIsVisible && data.is_visible !== undefined) {
        setClauses.push('is_visible = ?');
        values.push(
          ensureSqliteBooleanNumber(data.is_visible, 'Token visibility'),
        );
      }

      const updateSql = setClauses.length > 0
        ? `UPDATE tokens SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE tokens SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(id) as Token | undefined;
      if (!token) {
        throw new Error('Token not found');
      }
      return token;
    },
  );
}

function registerTokenMoveHandlers(): void {
  ipcMain.handle(IPC.TOKENS_MOVE_TO_WORLD, (_event, tokenId: number) => {
    return dbHandlers.tokens.moveToWorld(tokenId);
  });

  ipcMain.handle(
    IPC.TOKENS_MOVE_TO_CAMPAIGN,
    (_event, tokenId: number, targetCampaignId: number) => {
      return dbHandlers.tokens.moveToCampaign(tokenId, targetCampaignId);
    },
  );
}

function registerTokenDeleteHandler(db: Database.Database): void {
  ipcMain.handle(IPC.TOKENS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM tokens WHERE id = ?').run(id);
    return { id };
  });
}

function registerTokenImageImportHandler(
  dependencies: RegisterTokenHandlersDependencies,
): void {
  ipcMain.handle(
    IPC.TOKENS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureTokenImageImportPayload(payload);

      const tokenImagesDir = tokenImagesDirectoryPath(dependencies.userDataPath);
      await mkdir(tokenImagesDir, { recursive: true });

      const extension = TOKEN_IMAGE_MIME_TO_EXTENSION[mimeType];
      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(tokenImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildTokenImageMediaUrl(uniqueFileName),
      };
    },
  );
}

export function registerTokenHandlers(
  db: Database.Database,
  dependencies: RegisterTokenHandlersDependencies,
): void {
  registerTokenReadHandlers(db);
  registerTokenAddHandler(db);
  registerTokenUpdateHandler(db);
  registerTokenMoveHandlers();
  registerTokenDeleteHandler(db);
  registerTokenImageImportHandler(dependencies);
}
