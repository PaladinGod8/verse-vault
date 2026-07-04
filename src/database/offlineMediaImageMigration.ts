import type Database from 'better-sqlite3';
import { type MediaImageHost, normalizeMediaImageSrcForHost } from '../shared/media/imageSource';

type MediaImageTable = {
  table: string;
  column: string;
  host: MediaImageHost;
};

const MEDIA_IMAGE_TABLES: MediaImageTable[] = [
  { table: 'worlds', column: 'thumbnail', host: 'world-images' },
  { table: 'worlds', column: 'original_thumbnail_src', host: 'world-images' },
  { table: 'tokens', column: 'image_src', host: 'token-images' },
  { table: 'characters', column: 'image_src', host: 'character-images' },
  { table: 'characters', column: 'original_image_src', host: 'character-images' },
  { table: 'backgrounds', column: 'image_src', host: 'background-images' },
  { table: 'backgrounds', column: 'original_image_src', host: 'background-images' },
  { table: 'items', column: 'image_src', host: 'item-images' },
  { table: 'items', column: 'original_image_src', host: 'item-images' },
  { table: 'factions', column: 'image_src', host: 'faction-images' },
  { table: 'factions', column: 'original_image_src', host: 'faction-images' },
  { table: 'lore_notes', column: 'image_src', host: 'lore-note-images' },
  { table: 'lore_notes', column: 'original_image_src', host: 'lore-note-images' },
];

function isMissingTableError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('no such table');
}

export function runOfflineMediaImageMigration(db: Database.Database): void {
  for (const { table, column, host } of MEDIA_IMAGE_TABLES) {
    let rows: Array<{ id: number; image_src: string | null; }>;

    try {
      rows = db
        .prepare(`SELECT id, ${column} AS image_src FROM ${table}`)
        .all() as Array<{ id: number; image_src: string | null; }>;
    } catch (error) {
      if (isMissingTableError(error)) {
        continue;
      }
      throw error;
    }

    for (const row of rows) {
      const nextImageSrc = normalizeMediaImageSrcForHost(row.image_src, host);
      if (nextImageSrc !== row.image_src) {
        db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(
          nextImageSrc,
          row.id,
        );
      }
    }
  }
}
