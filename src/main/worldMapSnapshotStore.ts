/**
 * @role World-map snapshot file store
 * @owns Atomic gzip read/write/delete of `.map.gz` snapshots on disk
 * @seam Deep module hiding fs + zlib + path-safety behind a storage-key interface
 * @calls node:fs/promises, node:zlib, node:path
 *
 * Snapshots live flat under a single base directory
 * (`app.getPath('userData')/world-maps`). `storage_key` is a bare filename
 * (`world-map-<id>.map.gz`) — never a path — and is whitelisted to that folder.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const gzipAsync = promisify(gzip);

export interface WorldMapSnapshotStore {
  storageKeyForWorldMap(worldMapId: number): string;
  resolveSnapshotPath(storageKey: string): string;
  writeSnapshot(storageKey: string, mapData: string): Promise<void>;
  readSnapshot(storageKey: string): Promise<Buffer>;
  deleteSnapshot(storageKey: string): Promise<void>;
}

export function createWorldMapSnapshotStore(
  options: { baseDir: string; },
): WorldMapSnapshotStore {
  const baseDir = path.resolve(options.baseDir);

  function resolveSnapshotPath(storageKey: string): string {
    const fileName = path.basename(storageKey);
    if (!fileName || fileName !== storageKey) {
      throw new Error('Invalid world map storage key');
    }
    const filePath = path.resolve(path.join(baseDir, fileName));
    if (path.dirname(filePath) !== baseDir) {
      throw new Error('Invalid world map storage key');
    }
    return filePath;
  }

  return {
    storageKeyForWorldMap(worldMapId: number): string {
      return `world-map-${worldMapId}.map.gz`;
    },

    resolveSnapshotPath,

    async writeSnapshot(storageKey: string, mapData: string): Promise<void> {
      const filePath = resolveSnapshotPath(storageKey);
      await mkdir(baseDir, { recursive: true });
      const compressed = await gzipAsync(Buffer.from(mapData, 'utf8'));
      // Write to a temp sibling then atomically rename, so a crash mid-write
      // never leaves a truncated snapshot in place of the previous good one.
      const tempPath = `${filePath}.tmp-${randomUUID()}`;
      await writeFile(tempPath, compressed);
      await rename(tempPath, filePath);
    },

    async readSnapshot(storageKey: string): Promise<Buffer> {
      return readFile(resolveSnapshotPath(storageKey));
    },

    async deleteSnapshot(storageKey: string): Promise<void> {
      await rm(resolveSnapshotPath(storageKey), { force: true });
    },
  };
}
