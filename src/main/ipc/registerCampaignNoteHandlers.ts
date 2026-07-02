import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';
import {
  normalizeCanvasPreviewImage,
  parseCanvasScene,
  serializeCanvasScene,
} from './canvasPersistence';
import { normalizeTags } from './noteTagUtils';

type CampaignNoteUpsertData = {
  world_id?: number;
  campaign_id?: number;
  name?: string;
  canvas_scene?: unknown;
  canvas_preview_image?: string | null;
  tags?: unknown;
};

type CampaignNoteTagRow = { campaign_note_id: number; tag_name: string; };

function fetchTagsForCampaignNote(db: Database.Database, campaignNoteId: number): string[] {
  const rows = db
    .prepare(
      'SELECT tag_name FROM campaign_note_tags WHERE campaign_note_id = ? ORDER BY tag_name COLLATE NOCASE',
    )
    .all(campaignNoteId) as Array<{ tag_name: string; }>;

  return rows.map((row) => row.tag_name);
}

function replaceTagsForCampaignNote(
  db: Database.Database,
  campaignNoteId: number,
  worldId: number,
  campaignId: number,
  tags: string[],
): void {
  db.prepare('DELETE FROM campaign_note_tags WHERE campaign_note_id = ?').run(campaignNoteId);
  const insertTag = db.prepare(
    'INSERT INTO campaign_note_tags (campaign_note_id, world_id, campaign_id, tag_name) VALUES (?, ?, ?, ?)',
  );

  for (const tag of tags) {
    insertTag.run(campaignNoteId, worldId, campaignId, tag);
  }
}

function mapCampaignNoteRow(
  row: Record<string, unknown>,
  tags: string[],
): CampaignNote {
  return {
    ...(row as Omit<CampaignNote, 'canvas_scene' | 'canvas_preview_image' | 'tags'>),
    canvas_scene: parseCanvasScene(row.canvas_scene),
    canvas_preview_image: normalizeCanvasPreviewImage(row.canvas_preview_image),
    tags,
  };
}

function attachTagsToCampaignNotes(
  db: Database.Database,
  campaignId: number,
  notes: Array<Record<string, unknown>>,
): CampaignNote[] {
  if (notes.length === 0) {
    return [];
  }

  const tagRows = db
    .prepare(
      'SELECT campaign_note_id, tag_name FROM campaign_note_tags WHERE campaign_id = ? ORDER BY tag_name COLLATE NOCASE',
    )
    .all(campaignId) as CampaignNoteTagRow[];

  const tagsByNoteId = new Map<number, string[]>();
  for (const row of tagRows) {
    const existing = tagsByNoteId.get(row.campaign_note_id) ?? [];
    existing.push(row.tag_name);
    tagsByNoteId.set(row.campaign_note_id, existing);
  }

  return notes.map((note) => mapCampaignNoteRow(note, tagsByNoteId.get(note.id as number) ?? []));
}

function buildUpdateStatement(data: CampaignNoteUpsertData): {
  setClauses: string[];
  values: Array<string | null>;
} {
  const setClauses: string[] = [];
  const values: Array<string | null> = [];

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
    if (!trimmedName) {
      throw new Error('Campaign note name is required');
    }
    setClauses.push('name = ?');
    values.push(trimmedName);
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

export function registerCampaignNoteHandlers(db: Database.Database): void {
  registerCampaignNoteReadHandlers(db);
  registerCampaignNoteWriteHandlers(db);
}

function registerCampaignNoteReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.CAMPAIGN_NOTES_GET_ALL_BY_CAMPAIGN, (_event, campaignId: number) => {
    const notes = db
      .prepare('SELECT * FROM campaign_notes WHERE campaign_id = ? ORDER BY updated_at DESC')
      .all(campaignId) as Array<Record<string, unknown>>;

    return attachTagsToCampaignNotes(db, campaignId, notes);
  });

  ipcMain.handle(IPC.CAMPAIGN_NOTES_GET_BY_ID, (_event, id: number) => {
    const note = db.prepare('SELECT * FROM campaign_notes WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;

    if (!note) {
      return null;
    }

    return mapCampaignNoteRow(note, fetchTagsForCampaignNote(db, id));
  });

  ipcMain.handle(IPC.CAMPAIGN_NOTE_TAGS_GET_ALL_BY_CAMPAIGN, (_event, campaignId: number) => {
    const rows = db
      .prepare(
        'SELECT DISTINCT tag_name FROM campaign_note_tags WHERE campaign_id = ? ORDER BY tag_name COLLATE NOCASE',
      )
      .all(campaignId) as Array<{ tag_name: string; }>;

    return rows.map((row) => row.tag_name);
  });
}

function registerCampaignNoteWriteHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.CAMPAIGN_NOTES_ADD, (_event, data: CampaignNoteUpsertData) => {
    const worldId = typeof data.world_id === 'number' ? data.world_id : null;
    if (!worldId) {
      throw new Error('Campaign note world_id is required');
    }

    const campaignId = typeof data.campaign_id === 'number' ? data.campaign_id : null;
    if (!campaignId) {
      throw new Error('Campaign note campaign_id is required');
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Campaign note name is required');
    }

    const canvasScene = serializeCanvasScene(data.canvas_scene);
    const canvasPreviewImage = normalizeCanvasPreviewImage(data.canvas_preview_image);
    const tags = normalizeTags(data.tags);

    const insertCampaignNote = db.transaction(() => {
      const result = db
        .prepare(
          'INSERT INTO campaign_notes (world_id, campaign_id, name, canvas_scene, canvas_preview_image) VALUES (?, ?, ?, ?, ?)',
        )
        .run(worldId, campaignId, name, canvasScene, canvasPreviewImage);
      const campaignNoteId = result.lastInsertRowid as number;
      replaceTagsForCampaignNote(db, campaignNoteId, worldId, campaignId, tags);
      return campaignNoteId;
    });

    const campaignNoteId = insertCampaignNote();
    const note = db.prepare('SELECT * FROM campaign_notes WHERE id = ?').get(campaignNoteId) as
      | Record<string, unknown>
      | undefined;

    if (!note) {
      throw new Error('Failed to create campaign note');
    }

    return mapCampaignNoteRow(note, tags);
  });

  ipcMain.handle(IPC.CAMPAIGN_NOTES_UPDATE, (_event, id: number, data: CampaignNoteUpsertData) => {
    const existingNote = db.prepare('SELECT * FROM campaign_notes WHERE id = ?').get(id) as
      | { world_id: number; campaign_id: number; }
      | undefined;

    if (!existingNote) {
      throw new Error('Campaign note not found');
    }

    const { setClauses, values } = buildUpdateStatement(data);
    const updateSql = setClauses.length > 0
      ? `UPDATE campaign_notes SET ${
        setClauses.join(', ')
      }, updated_at = datetime('now') WHERE id = ?`
      : "UPDATE campaign_notes SET updated_at = datetime('now') WHERE id = ?";
    db.prepare(updateSql).run(...values, id);

    let tags: string[] | undefined;
    if (Object.prototype.hasOwnProperty.call(data, 'tags')) {
      tags = normalizeTags(data.tags);
      replaceTagsForCampaignNote(
        db,
        id,
        existingNote.world_id,
        existingNote.campaign_id,
        tags,
      );
    }

    const note = db.prepare('SELECT * FROM campaign_notes WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!note) {
      throw new Error('Campaign note not found');
    }

    return mapCampaignNoteRow(note, tags ?? fetchTagsForCampaignNote(db, id));
  });

  ipcMain.handle(IPC.CAMPAIGN_NOTES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM campaign_note_tags WHERE campaign_note_id = ?').run(id);
    db.prepare('DELETE FROM campaign_notes WHERE id = ?').run(id);
    return { id };
  });
}
