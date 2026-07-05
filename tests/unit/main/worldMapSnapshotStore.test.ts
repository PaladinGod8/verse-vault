import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorldMapSnapshotStore } from '../../../src/main/worldMapSnapshotStore';

describe('createWorldMapSnapshotStore', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), 'vv-world-maps-'));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('derives the storage key from the world-map row id', () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    expect(store.storageKeyForWorldMap(7)).toBe('world-map-7.map.gz');
  });

  it('writes a gzip snapshot that round-trips back to the original map data', async () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    const mapData = 'Azgaar|1.99|<svg>...</svg>|payload';

    await store.writeSnapshot('world-map-1.map.gz', mapData);

    const bytes = await readFile(path.join(baseDir, 'world-map-1.map.gz'));
    expect(gunzipSync(bytes).toString('utf8')).toBe(mapData);
  });

  it('overwrites an existing snapshot on a second write', async () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    await store.writeSnapshot('world-map-1.map.gz', 'first');
    await store.writeSnapshot('world-map-1.map.gz', 'second');

    const bytes = await store.readSnapshot('world-map-1.map.gz');
    expect(gunzipSync(bytes).toString('utf8')).toBe('second');
  });

  it('leaves no leftover temp files after an atomic write', async () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    await store.writeSnapshot('world-map-1.map.gz', 'data');

    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(baseDir);
    expect(entries).toEqual(['world-map-1.map.gz']);
  });

  it('deletes a snapshot and is a no-op when already gone', async () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    await store.writeSnapshot('world-map-1.map.gz', 'data');

    await store.deleteSnapshot('world-map-1.map.gz');
    await expect(stat(path.join(baseDir, 'world-map-1.map.gz'))).rejects.toThrow();
    // second delete must not throw
    await expect(store.deleteSnapshot('world-map-1.map.gz')).resolves.toBeUndefined();
  });

  it('rejects storage keys that escape the base directory', async () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    await expect(store.writeSnapshot('../evil.map.gz', 'x')).rejects.toThrow(
      'Invalid world map storage key',
    );
    expect(() => store.resolveSnapshotPath('sub/dir.map.gz')).toThrow(
      'Invalid world map storage key',
    );
  });

  it('rejects a storage key that resolves outside the base directory even without a separator', () => {
    const store = createWorldMapSnapshotStore({ baseDir });
    expect(() => store.resolveSnapshotPath('..')).toThrow('Invalid world map storage key');
  });
});
