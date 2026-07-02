/**
 * @role Lore Note IPC registrar
 * @owns Lore Note CRUD, tag vocabulary, and image import channel handlers
 * @seam Main-process adapter for lore note IPC requests
 * @calls SQLite statements, filesystem persistence, and shared image validation
 */
import type Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { IPC } from '../../shared/ipcChannels';
import { normalizeMediaImageSrcForHost } from '../../shared/media/imageSource';
import {
  normalizeCanvasEnabled,
  normalizeCanvasPreviewImage,
  parseCanvasScene,
  serializeCanvasScene,
} from './canvasPersistence';
import { normalizeTags } from './noteTagUtils';

const LORE_NOTE_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const LORE_NOTE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const LORE_NOTE_IMAGE_PROTOCOL = 'vv-media';
const LORE_NOTE_IMAGE_HOST = 'lore-note-images';

type LoreNoteUpsertData = {
  world_id?: number;
  name?: string;
  content?: string | null;
  image_src?: string | null;
  canvas_enabled?: boolean;
  canvas_scene?: unknown;
  canvas_preview_image?: string | null;
  tags?: unknown;
};

type LoreNoteTagRow = { lore_note_id: number; tag_name: string; };

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fetchTagsForNote(db: Database.Database, loreNoteId: number): string[] {
  const rows = db
    .prepare(
      'SELECT tag_name FROM lore_note_tags WHERE lore_note_id = ? ORDER BY tag_name COLLATE NOCASE',
    )
    .all(loreNoteId) as Array<{ tag_name: string; }>;
  return rows.map((row) => row.tag_name);
}

function replaceTagsForNote(
  db: Database.Database,
  loreNoteId: number,
  worldId: number,
  tags: string[],
): void {
  db.prepare('DELETE FROM lore_note_tags WHERE lore_note_id = ?').run(loreNoteId);
  const insertTag = db.prepare(
    'INSERT INTO lore_note_tags (lore_note_id, world_id, tag_name) VALUES (?, ?, ?)',
  );
  for (const tag of tags) {
    insertTag.run(loreNoteId, worldId, tag);
  }
}

function attachTagsToNotes(
  db: Database.Database,
  worldId: number,
  notes: Array<Record<string, unknown>>,
): LoreNote[] {
  if (notes.length === 0) {
    return [];
  }

  const tagRows = db
    .prepare(
      'SELECT lore_note_id, tag_name FROM lore_note_tags WHERE world_id = ? ORDER BY tag_name COLLATE NOCASE',
    )
    .all(worldId) as LoreNoteTagRow[];

  const tagsByNoteId = new Map<number, string[]>();
  for (const row of tagRows) {
    const existing = tagsByNoteId.get(row.lore_note_id) ?? [];
    existing.push(row.tag_name);
    tagsByNoteId.set(row.lore_note_id, existing);
  }

  return notes.map((note) => mapLoreNoteRow(note, tagsByNoteId.get(note.id as number) ?? []));
}

function mapLoreNoteRow(row: Record<string, unknown>, tags: string[]): LoreNote {
  return {
    ...(row as Omit<LoreNote, 'canvas_enabled' | 'canvas_scene' | 'canvas_preview_image' | 'tags'>),
    canvas_enabled: normalizeCanvasEnabled(row.canvas_enabled),
    canvas_scene: parseCanvasScene(row.canvas_scene),
    canvas_preview_image: normalizeCanvasPreviewImage(row.canvas_preview_image),
    tags,
  };
}

function buildLoreNoteUpdateStatement(data: LoreNoteUpsertData): {
  setClauses: string[];
  values: Array<string | null>;
} {
  const setClauses: string[] = [];
  const values: Array<string | null> = [];

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
    if (!trimmedName) {
      throw new Error('Lore note name is required');
    }
    setClauses.push('name = ?');
    values.push(trimmedName);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'content')) {
    setClauses.push('content = ?');
    values.push(normalizeOptionalText(data.content));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'image_src')) {
    setClauses.push('image_src = ?');
    values.push(normalizeMediaImageSrcForHost(data.image_src, LORE_NOTE_IMAGE_HOST));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'canvas_enabled')) {
    setClauses.push('canvas_enabled = ?');
    values.push(data.canvas_enabled ? '1' : '0');
  }

  if (Object.prototype.hasOwnProperty.call(data, 'canvas_scene')) {
    setClauses.push('canvas_scene = ?');
    values.push(serializeCanvasScene(data.canvas_scene));
  }

  if (Object.prototype.hasOwnProperty.call(data, 'canvas_preview_image')) {
    setClauses.push('canvas_preview_image = ?');
    values.push(normalizeCanvasPreviewImage(data.canvas_preview_image));
  }

  return { setClauses, values };
}

function registerLoreNoteReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.LORE_NOTES_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    const notes = db
      .prepare('SELECT * FROM lore_notes WHERE world_id = ? ORDER BY updated_at DESC')
      .all(worldId) as Array<Record<string, unknown>>;
    return attachTagsToNotes(db, worldId, notes);
  });

  ipcMain.handle(IPC.LORE_NOTES_GET_BY_ID, (_event, id: number) => {
    const note = db.prepare('SELECT * FROM lore_notes WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!note) {
      return null;
    }
    return mapLoreNoteRow(note, fetchTagsForNote(db, id));
  });

  ipcMain.handle(IPC.LORE_NOTES_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE lore_notes SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    const note = db.prepare('SELECT * FROM lore_notes WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!note) {
      return null;
    }
    return mapLoreNoteRow(note, fetchTagsForNote(db, id));
  });

  ipcMain.handle(IPC.LORE_NOTE_TAGS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    const rows = db
      .prepare(
        'SELECT DISTINCT tag_name FROM lore_note_tags WHERE world_id = ? ORDER BY tag_name COLLATE NOCASE',
      )
      .all(worldId) as Array<{ tag_name: string; }>;
    return rows.map((row) => row.tag_name);
  });
}

function registerLoreNoteMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.LORE_NOTES_ADD, (_event, data: LoreNoteUpsertData) => {
    const worldId = typeof data.world_id === 'number' ? data.world_id : null;
    if (!worldId) {
      throw new Error('Lore note world_id is required');
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Lore note name is required');
    }

    const content = normalizeOptionalText(data.content);
    const imageSrc = normalizeMediaImageSrcForHost(
      data.image_src,
      LORE_NOTE_IMAGE_HOST,
    );
    const canvasEnabled = data.canvas_enabled ? 1 : 0;
    const canvasScene = serializeCanvasScene(data.canvas_scene);
    const canvasPreviewImage = normalizeCanvasPreviewImage(data.canvas_preview_image);
    const tags = normalizeTags(data.tags);

    const insertLoreNote = db.transaction(() => {
      const stmt = db.prepare(
        'INSERT INTO lore_notes (world_id, name, content, image_src, canvas_enabled, canvas_scene, canvas_preview_image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      const result = stmt.run(
        worldId,
        name,
        content,
        imageSrc,
        canvasEnabled,
        canvasScene,
        canvasPreviewImage,
      );
      const loreNoteId = result.lastInsertRowid as number;
      replaceTagsForNote(db, loreNoteId, worldId, tags);
      return loreNoteId;
    });
    const loreNoteId = insertLoreNote();

    const note = db.prepare('SELECT * FROM lore_notes WHERE id = ?').get(loreNoteId) as
      | Record<string, unknown>
      | undefined;
    if (!note) {
      throw new Error('Failed to create lore note');
    }
    return mapLoreNoteRow(note, tags);
  });

  ipcMain.handle(IPC.LORE_NOTES_UPDATE, (_event, id: number, data: LoreNoteUpsertData) => {
    const existingNote = db.prepare('SELECT * FROM lore_notes WHERE id = ?').get(id) as
      | { world_id: number; }
      | undefined;
    if (!existingNote) {
      throw new Error('Lore note not found');
    }

    const { setClauses, values } = buildLoreNoteUpdateStatement(data);

    const updateSql = setClauses.length > 0
      ? `UPDATE lore_notes SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE lore_notes SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    let tags: string[] | undefined;
    if (Object.prototype.hasOwnProperty.call(data, 'tags')) {
      tags = normalizeTags(data.tags);
      replaceTagsForNote(db, id, existingNote.world_id, tags);
    }

    const note = db.prepare('SELECT * FROM lore_notes WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!note) {
      throw new Error('Lore note not found');
    }
    return mapLoreNoteRow(note, tags ?? fetchTagsForNote(db, id));
  });

  ipcMain.handle(IPC.LORE_NOTES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM lore_note_tags WHERE lore_note_id = ?').run(id);
    db.prepare('DELETE FROM lore_notes WHERE id = ?').run(id);
    return { id };
  });
}

function registerLoreNoteImageImportHandler(): void {
  ipcMain.handle(
    IPC.LORE_NOTES_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureLoreNoteImageImportPayload(payload);

      const loreNoteImagesDir = loreNoteImagesDirectoryPath();
      await mkdir(loreNoteImagesDir, { recursive: true });

      const extension = LORE_NOTE_IMAGE_MIME_TO_EXTENSION[mimeType];
      if (!extension) {
        throw new Error('Unsupported lore note image mimeType');
      }

      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(loreNoteImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildLoreNoteImageMediaUrl(uniqueFileName),
      };
    },
  );
}

function ensureLoreNoteImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof LORE_NOTE_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Lore note image fileName is required');
  }

  const mimeType = typeof payload.mimeType === 'string'
    ? payload.mimeType.trim().toLowerCase()
    : '';
  if (!Object.prototype.hasOwnProperty.call(LORE_NOTE_IMAGE_MIME_TO_EXTENSION, mimeType)) {
    throw new Error(
      'Unsupported lore note image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Lore note image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Lore note image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > LORE_NOTE_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Lore note image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof LORE_NOTE_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function loreNoteImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'lore-note-images');
}

function buildLoreNoteImageMediaUrl(fileName: string): string {
  return `${LORE_NOTE_IMAGE_PROTOCOL}://${LORE_NOTE_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

export function registerLoreNoteHandlers(db: Database.Database): void {
  registerLoreNoteReadHandlers(db);
  registerLoreNoteMutationHandlers(db);
  registerLoreNoteImageImportHandler();
}
