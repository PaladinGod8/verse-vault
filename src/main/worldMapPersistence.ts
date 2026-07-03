/**
 * @role World-map snapshot persistence orchestrator
 * @owns The save flow that binds one row + one gzip snapshot file to a world
 * @seam Deep module composing the repo and snapshot store behind saveSnapshot
 * @calls WorldMapsRepo (sync SQLite) and WorldMapSnapshotStore (async fs)
 *
 * First save lazily creates the `world_maps` row (per PLAN.md §7): the row is
 * created only when real map data is persisted, and is rolled back if the
 * snapshot file cannot be written, so a row never exists without its file.
 */
import type { WorldMapsRepo } from '../database/repos/worldMapsRepo';
import type { WorldMap, WorldMapSaveMeta } from '../shared/contracts/domainTypes';
import type { WorldMapSnapshotStore } from './worldMapSnapshotStore';

export interface WorldMapPersistence {
  getByWorld(worldId: number): WorldMap | null;
  deleteByWorld(worldId: number): Promise<void>;
  saveSnapshot(
    worldId: number,
    mapData: string,
    meta: WorldMapSaveMeta,
  ): Promise<WorldMap>;
}

export function createWorldMapPersistence(deps: {
  repo: WorldMapsRepo;
  store: WorldMapSnapshotStore;
}): WorldMapPersistence {
  const { repo, store } = deps;

  return {
    getByWorld(worldId: number): WorldMap | null {
      return repo.getByWorld(worldId);
    },

    async deleteByWorld(worldId: number): Promise<void> {
      const existing = repo.getByWorld(worldId);
      if (!existing) {
        return;
      }
      await store.deleteSnapshot(existing.storage_key);
    },

    async saveSnapshot(
      worldId: number,
      mapData: string,
      meta: WorldMapSaveMeta,
    ): Promise<WorldMap> {
      const existing = repo.getByWorld(worldId);
      if (existing) {
        await store.writeSnapshot(existing.storage_key, mapData);
        return repo.updateSnapshotMeta(existing.id, meta);
      }

      const created = repo.createForWorld(worldId, meta);
      try {
        await store.writeSnapshot(created.storage_key, mapData);
      } catch (error) {
        // Compensate: a row must never outlive a failed snapshot write.
        repo.delete(created.id);
        throw error;
      }
      return repo.getById(created.id) ?? created;
    },
  };
}
