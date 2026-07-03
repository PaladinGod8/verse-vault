import type Database from 'better-sqlite3';
import type { WorldMap, WorldMapSaveMeta } from '../../shared/contracts/domainTypes';

/**
 * @role World-map persistence repository
 * @owns Row reads/writes for the one-map-per-world `world_maps` table
 * @seam Main-process adapter consumed by world-map persistence + IPC registrar
 * @calls better-sqlite3 prepared statements only
 */
export interface WorldMapsRepo {
  getByWorld(worldId: number): WorldMap | null;
  getById(id: number): WorldMap | null;
  createForWorld(worldId: number, meta: WorldMapSaveMeta): WorldMap;
  updateSnapshotMeta(id: number, meta: WorldMapSaveMeta): WorldMap;
  delete(id: number): void;
}

function storageKeyForId(id: number): string {
  return `world-map-${id}.map.gz`;
}

export function createWorldMapsRepo(db: Database.Database): WorldMapsRepo {
  const getById = (id: number): WorldMap | null => {
    const row = db.prepare('SELECT * FROM world_maps WHERE id = ?').get(id) as
      | WorldMap
      | undefined;
    return row ?? null;
  };

  return {
    getByWorld(worldId: number): WorldMap | null {
      const row = db
        .prepare('SELECT * FROM world_maps WHERE world_id = ?')
        .get(worldId) as WorldMap | undefined;
      return row ?? null;
    },

    getById,

    createForWorld(worldId: number, meta: WorldMapSaveMeta): WorldMap {
      // Insert then set storage_key from the generated id, in one transaction, so
      // the on-disk filename (`world-map-<id>.map.gz`) is derived from the row id
      // the plan specifies. storage_key is NOT NULL, so it is inserted as '' first.
      // The transaction is built here (on save), never at construction, so wiring
      // up the repo touches no transactions.
      const insertForWorld = db.transaction(
        (wId: number, m: WorldMapSaveMeta): number => {
          const result = db
            .prepare(
              "INSERT INTO world_maps (world_id, map_name, storage_key, generator_version) VALUES (?, ?, '', ?)",
            )
            .run(wId, m.mapName, m.generatorVersion);
          const newId = Number(result.lastInsertRowid);
          db.prepare('UPDATE world_maps SET storage_key = ? WHERE id = ?').run(
            storageKeyForId(newId),
            newId,
          );
          return newId;
        },
      );

      const id = insertForWorld(worldId, meta);
      const row = getById(id);
      if (!row) {
        throw new Error('Failed to create world map');
      }
      return row;
    },

    updateSnapshotMeta(id: number, meta: WorldMapSaveMeta): WorldMap {
      db.prepare(
        "UPDATE world_maps SET map_name = ?, generator_version = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(meta.mapName, meta.generatorVersion, id);
      const row = getById(id);
      if (!row) {
        throw new Error('World map not found');
      }
      return row;
    },

    delete(id: number): void {
      db.prepare('DELETE FROM world_maps WHERE id = ?').run(id);
    },
  };
}
