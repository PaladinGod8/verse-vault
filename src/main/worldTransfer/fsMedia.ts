/**
 * @role World-transfer filesystem media adapter
 * @owns Synchronous read/write of media images and world-map snapshots under
 *   `userData`, so export/import can move binary blobs inside a sync DB transaction.
 * @seam Main-process adapter implementing WorldMediaReader (export) and
 *   WorldMediaWriter (import). Path-guarded to each host's flat folder.
 * @calls node:fs (sync), node:path, node:crypto.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { WorldMediaReader } from './exportWorld';
import type { WorldMediaWriter } from './importWorld';

const SNAPSHOT_DIR = 'world-maps';

function safeName(fileName: string): string | null {
  const base = path.basename(fileName);
  return base && base === fileName ? base : null;
}

export function createFsWorldMediaReader(userDataPath: string): WorldMediaReader {
  const readFrom = (dir: string, fileName: string): Buffer | null => {
    const name = safeName(fileName);
    if (!name) {
      return null;
    }
    const filePath = path.join(userDataPath, dir, name);
    return existsSync(filePath) ? readFileSync(filePath) : null;
  };
  return {
    readMedia: (host, fileName) => readFrom(host, fileName),
    readSnapshot: (storageKey) => readFrom(SNAPSHOT_DIR, storageKey),
  };
}

export function createFsWorldMediaWriter(userDataPath: string): WorldMediaWriter {
  return {
    writeMedia(host, originalFileName, bytes) {
      const extension = path.extname(safeName(originalFileName) ?? '') || '.bin';
      const uniqueName = `${Date.now()}-${randomUUID()}${extension}`;
      const dir = path.join(userDataPath, host);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, uniqueName), bytes);
      return `vv-media://${host}/${encodeURIComponent(uniqueName)}`;
    },
    writeSnapshot(worldMapId, bytes) {
      const storageKey = `world-map-${worldMapId}.map.gz`;
      const dir = path.join(userDataPath, SNAPSHOT_DIR);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, storageKey), bytes);
      return storageKey;
    },
  };
}
