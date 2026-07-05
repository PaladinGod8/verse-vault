import type Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';
import { runOfflineMediaImageMigration } from '../../../src/database/offlineMediaImageMigration';

describe('runOfflineMediaImageMigration', () => {
  it('canonicalizes legacy file URLs and clears external URLs across image tables', () => {
    const rowsByTable = {
      worlds: [
        {
          id: 1,
          thumbnail: 'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/world-images/alpha.png',
          original_thumbnail_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/world-images/alpha.png',
        },
        {
          id: 2,
          thumbnail: 'https://cdn.example.com/world.png',
          original_thumbnail_src: 'https://cdn.example.com/world.png',
        },
        {
          id: 3,
          thumbnail: 'vv-media://world-images/current.png',
          original_thumbnail_src: 'vv-media://world-images/current.png',
        },
      ],
      tokens: [
        {
          id: 10,
          image_src: 'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/token-images/wolf.png',
        },
        { id: 11, image_src: 'https://cdn.example.com/token.png' },
      ],
      characters: [
        {
          id: 20,
          image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/character-images/mage.png',
          original_image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/character-images/mage.png',
        },
      ],
      backgrounds: [
        {
          id: 30,
          image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/background-images/mist.png',
          original_image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/background-images/mist.png',
        },
      ],
      items: [
        {
          id: 40,
          image_src: 'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/item-images/blade.png',
          original_image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/item-images/blade.png',
        },
      ],
      factions: [
        {
          id: 50,
          image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/faction-images/banner.png',
          original_image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/faction-images/banner.png',
        },
      ],
      lore_notes: [
        {
          id: 60,
          image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/lore-note-images/history.png',
          original_image_src:
            'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/lore-note-images/history.png',
        },
      ],
    } as const;

    const runMock = vi.fn();
    const prepareMock = vi.fn((sql: string) => {
      const tableMatch = sql.match(/^SELECT id, (\w+) AS image_src FROM (\w+)/);
      if (tableMatch) {
        const [, column, table] = tableMatch;
        return {
          all: () =>
            (rowsByTable[table as keyof typeof rowsByTable] ?? []).map((row) => ({
              id: row.id,
              image_src: row[column as keyof typeof row] as unknown as string | null,
            })),
        };
      }

      const updateMatch = sql.match(/^UPDATE (\w+) SET (\w+) = \? WHERE id = \?/);
      if (updateMatch) {
        return { run: runMock };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const dbMock = {
      prepare: prepareMock,
    } as unknown as Database.Database;

    runOfflineMediaImageMigration(dbMock);

    expect(runMock.mock.calls).toEqual([
      ['vv-media://world-images/alpha.png', 1],
      [null, 2],
      ['vv-media://world-images/alpha.png', 1],
      [null, 2],
      ['vv-media://token-images/wolf.png', 10],
      [null, 11],
      ['vv-media://character-images/mage.png', 20],
      ['vv-media://character-images/mage.png', 20],
      ['vv-media://background-images/mist.png', 30],
      ['vv-media://background-images/mist.png', 30],
      ['vv-media://item-images/blade.png', 40],
      ['vv-media://item-images/blade.png', 40],
      ['vv-media://faction-images/banner.png', 50],
      ['vv-media://faction-images/banner.png', 50],
      ['vv-media://lore-note-images/history.png', 60],
      ['vv-media://lore-note-images/history.png', 60],
    ]);
  });

  it('skips tables that do not exist in legacy databases', () => {
    const runMock = vi.fn();
    const prepareMock = vi.fn((sql: string) => {
      if (sql.includes('FROM worlds')) {
        return { all: (): Array<{ id: number; image_src: string | null; }> => [] };
      }

      if (sql.includes('FROM tokens')) {
        return { all: (): Array<{ id: number; image_src: string | null; }> => [] };
      }

      throw new Error('no such table');
    });

    const dbMock = {
      prepare: prepareMock,
    } as unknown as Database.Database;

    expect(() => runOfflineMediaImageMigration(dbMock)).not.toThrow();
    expect(runMock).not.toHaveBeenCalled();
  });

  it('rethrows errors that are not caused by a missing table', () => {
    const prepareMock = vi.fn((sql: string) => {
      if (sql.includes('FROM worlds')) {
        throw new Error('disk I/O error');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const dbMock = {
      prepare: prepareMock,
    } as unknown as Database.Database;

    expect(() => runOfflineMediaImageMigration(dbMock)).toThrow('disk I/O error');
  });
});
