import type Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';
import { runItemsSchemaMigration } from '../../../src/database/itemMigrations';

function buildDbMock(cols: Array<{ name: string; }>) {
  const execMock = vi.fn();
  const pragmaMock = vi.fn(() => cols);
  const db = { exec: execMock, pragma: pragmaMock } as unknown as Database.Database;
  return { db, execMock };
}

describe('runItemsSchemaMigration', () => {
  it('adds missing columns to a legacy items table', () => {
    const { db, execMock } = buildDbMock([{ name: 'id' }, { name: 'name' }]);

    runItemsSchemaMigration(db);

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('ALTER TABLE items ADD COLUMN original_image_src TEXT');
    expect(sql).toContain('ALTER TABLE items ADD COLUMN image_crop TEXT');
    expect(sql).toContain('ALTER TABLE items ADD COLUMN last_viewed_at TEXT');
  });

  it('is idempotent and skips columns that already exist', () => {
    const { db, execMock } = buildDbMock([
      { name: 'id' },
      { name: 'original_image_src' },
      { name: 'image_crop' },
      { name: 'last_viewed_at' },
    ]);

    runItemsSchemaMigration(db);

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).not.toContain('ALTER TABLE items ADD COLUMN original_image_src');
    expect(sql).not.toContain('ALTER TABLE items ADD COLUMN image_crop');
    expect(sql).not.toContain('ALTER TABLE items ADD COLUMN last_viewed_at');
  });
});
