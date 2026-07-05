import type Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';
import { runLoreNotesSchemaMigration } from '../../../src/database/loreNoteMigrations';

function buildDbMock(cols: Array<{ name: string; }>) {
  const execMock = vi.fn();
  const pragmaMock = vi.fn(() => cols);
  const db = { exec: execMock, pragma: pragmaMock } as unknown as Database.Database;
  return { db, execMock };
}

describe('runLoreNotesSchemaMigration', () => {
  it('adds missing columns to a legacy lore_notes table', () => {
    const { db, execMock } = buildDbMock([{ name: 'id' }, { name: 'name' }]);

    runLoreNotesSchemaMigration(db);

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('ALTER TABLE lore_notes ADD COLUMN original_image_src TEXT');
    expect(sql).toContain('ALTER TABLE lore_notes ADD COLUMN image_crop TEXT');
    expect(sql).toContain(
      'ALTER TABLE lore_notes ADD COLUMN canvas_enabled INTEGER NOT NULL DEFAULT 0',
    );
    expect(sql).toContain('ALTER TABLE lore_notes ADD COLUMN canvas_scene TEXT');
    expect(sql).toContain('ALTER TABLE lore_notes ADD COLUMN canvas_preview_image TEXT');
    expect(sql).toContain('ALTER TABLE lore_notes ADD COLUMN last_viewed_at TEXT');
  });

  it('is idempotent and skips columns that already exist', () => {
    const { db, execMock } = buildDbMock([
      { name: 'id' },
      { name: 'original_image_src' },
      { name: 'image_crop' },
      { name: 'canvas_enabled' },
      { name: 'canvas_scene' },
      { name: 'canvas_preview_image' },
      { name: 'last_viewed_at' },
    ]);

    runLoreNotesSchemaMigration(db);

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN original_image_src');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN image_crop');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN canvas_enabled');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN canvas_scene');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN canvas_preview_image');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN last_viewed_at');
  });
});
