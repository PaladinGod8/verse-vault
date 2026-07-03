import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WorldMapsRepo } from '../../../src/database/repos/worldMapsRepo';
import { createWorldMapPersistence } from '../../../src/main/worldMapPersistence';
import {
  createWorldMapSnapshotStore,
  type WorldMapSnapshotStore,
} from '../../../src/main/worldMapSnapshotStore';
import type { WorldMap, WorldMapSaveMeta } from '../../../src/shared/contracts/domainTypes';

// State-based fake repo: an in-memory stand-in for the SQLite-backed repo,
// keyed by row id, enforcing one row per world via getByWorld.
function createFakeRepo() {
  const rows = new Map<number, WorldMap>();
  let nextId = 1;

  const repo: WorldMapsRepo = {
    getByWorld: (worldId) => [...rows.values()].find((r) => r.world_id === worldId) ?? null,
    getById: (id) => rows.get(id) ?? null,
    createForWorld: (worldId, meta) => {
      const id = nextId++;
      const row: WorldMap = {
        id,
        world_id: worldId,
        map_name: meta.mapName,
        storage_key: `world-map-${id}.map.gz`,
        generator_version: meta.generatorVersion,
        created_at: 'created',
        updated_at: 'created',
      };
      rows.set(id, row);
      return row;
    },
    updateSnapshotMeta: (id, meta) => {
      const row = rows.get(id);
      if (!row) {
        throw new Error('World map not found');
      }
      const updated: WorldMap = {
        ...row,
        map_name: meta.mapName,
        generator_version: meta.generatorVersion,
        updated_at: 'updated',
      };
      rows.set(id, updated);
      return updated;
    },
    delete: (id) => {
      rows.delete(id);
    },
  };

  return { repo, rows };
}

const META: WorldMapSaveMeta = { mapName: 'My World', generatorVersion: '1.99' };

describe('createWorldMapPersistence.saveSnapshot', () => {
  let baseDir: string;
  let store: WorldMapSnapshotStore;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), 'vv-wm-persist-'));
    store = createWorldMapSnapshotStore({ baseDir });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('first save binds a new row and writes its gzip snapshot', async () => {
    const { repo, rows } = createFakeRepo();
    const persistence = createWorldMapPersistence({ repo, store });

    const saved = await persistence.saveSnapshot(3, 'MAPDATA-A', META);

    expect(saved.world_id).toBe(3);
    expect(saved.map_name).toBe('My World');
    expect(rows.size).toBe(1);

    const bytes = await store.readSnapshot(saved.storage_key);
    expect(gunzipSync(bytes).toString('utf8')).toBe('MAPDATA-A');
  });

  it('second save reuses the same row and overwrites the snapshot', async () => {
    const { repo, rows } = createFakeRepo();
    const persistence = createWorldMapPersistence({ repo, store });

    const first = await persistence.saveSnapshot(3, 'MAPDATA-A', META);
    const second = await persistence.saveSnapshot(3, 'MAPDATA-B', {
      mapName: 'Renamed',
      generatorVersion: '1.99',
    });

    expect(second.id).toBe(first.id);
    expect(rows.size).toBe(1);
    expect(second.map_name).toBe('Renamed');

    const bytes = await store.readSnapshot(second.storage_key);
    expect(gunzipSync(bytes).toString('utf8')).toBe('MAPDATA-B');
  });

  it('returns the created row when readback after a successful first save is unavailable', async () => {
    const { repo } = createFakeRepo();
    const persistence = createWorldMapPersistence({
      repo: {
        ...repo,
        getById: () => null,
      },
      store,
    });

    const saved = await persistence.saveSnapshot(3, 'MAPDATA-A', META);

    expect(saved.world_id).toBe(3);
    expect(saved.storage_key).toBe('world-map-1.map.gz');
  });

  it('rolls back the newly created row when the snapshot write fails', async () => {
    const { repo, rows } = createFakeRepo();
    const failingStore = {
      ...store,
      writeSnapshot: () => Promise.reject(new Error('disk full')),
    } as WorldMapSnapshotStore;
    const persistence = createWorldMapPersistence({ repo, store: failingStore });

    await expect(persistence.saveSnapshot(3, 'MAPDATA', META)).rejects.toThrow('disk full');

    expect(rows.size).toBe(0);
    expect(repo.getByWorld(3)).toBeNull();
  });

  it('deletes bound snapshot file for a world when one exists', async () => {
    const { repo } = createFakeRepo();
    const persistence = createWorldMapPersistence({ repo, store });
    const saved = await persistence.saveSnapshot(3, 'MAPDATA-A', META);

    await persistence.deleteByWorld(3);

    await expect(store.readSnapshot(saved.storage_key)).rejects.toThrow();
  });

  it('does nothing when deleting snapshots for a world with no bound map', async () => {
    const { repo } = createFakeRepo();
    const persistence = createWorldMapPersistence({ repo, store });

    await expect(persistence.deleteByWorld(999)).resolves.toBeUndefined();
  });
});
