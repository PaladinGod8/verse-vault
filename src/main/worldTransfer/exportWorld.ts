/**
 * @role World export orchestrator
 * @owns Reading one world's rows across every registry table, gathering its media
 *   and world-map snapshot files, and packing them into a `.zip` bundle.
 * @seam Main-process module; wires better-sqlite3 + fflate to the pure registry,
 *   manifest, and mediaRef helpers. Covered by e2e (real SQLite), not unit tests.
 * @calls better-sqlite3 statements, fflate.zipSync.
 */
import type Database from 'better-sqlite3';
import { zipSync } from 'fflate';
import type { Row } from './idRemap';
import { buildManifest } from './manifest';
import { mediaZipPath, parseMediaFileName, snapshotZipPath } from './mediaRef';
import { WORLD_TABLE_REGISTRY, type WorldTableSpec } from './tableRegistry';

/** Supplies the binary bytes that live outside the DB. */
export interface WorldMediaReader {
  /** Bytes of a `userData/<host>/<fileName>` media file, or null if missing. */
  readMedia(host: string, fileName: string): Buffer | null;
  /** Bytes of a `.map.gz` snapshot by storage key, or null if missing. */
  readSnapshot(storageKey: string): Buffer | null;
}

export interface WorldExportResult {
  zip: Uint8Array;
  worldName: string;
}

function assertValidWorldId(worldId: number): void {
  if (!Number.isInteger(worldId) || worldId <= 0) {
    throw new Error('Export requires a valid world id');
  }
}

export function exportWorld(
  db: Database.Database,
  worldId: number,
  media: WorldMediaReader,
  appVersion: string,
): WorldExportResult {
  assertValidWorldId(worldId);

  const worldRow = db.prepare('SELECT * FROM worlds WHERE id = ?').get(worldId) as
    | Row
    | undefined;
  if (!worldRow) {
    throw new Error(`World ${worldId} not found`);
  }

  const tables: Record<string, Row[]> = {};
  const collectedIds: Record<string, number[]> = {};
  const files: Record<string, Uint8Array> = {};

  for (const spec of WORLD_TABLE_REGISTRY) {
    const rows = selectRows(db, spec, worldId, collectedIds);
    tables[spec.name] = rows;
    collectedIds[spec.name] = rows.map((row) => row.id as number);
    collectMediaFor(spec, rows, media, files);
  }

  const tableCounts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(tables)) {
    tableCounts[name] = rows.length;
  }

  const worldName = typeof worldRow.name === 'string' ? worldRow.name : 'World';
  const manifest = buildManifest({ worldName, tableCounts, appVersion });

  const encoder = new TextEncoder();
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest, null, 2));
  files['data.json'] = encoder.encode(JSON.stringify({ tables }));

  return { zip: zipSync(files, { level: 6 }), worldName };
}

function selectRows(
  db: Database.Database,
  spec: WorldTableSpec,
  worldId: number,
  collectedIds: Record<string, number[]>,
): Row[] {
  if (spec.select.by === 'root') {
    return db.prepare('SELECT * FROM worlds WHERE id = ?').all(worldId) as Row[];
  }
  if (spec.select.by === 'world') {
    return db.prepare(`SELECT * FROM ${spec.name} WHERE world_id = ?`).all(worldId) as Row[];
  }

  const parentIds = collectedIds[spec.select.parentTable] ?? [];
  if (parentIds.length === 0) {
    return [];
  }
  const placeholders = parentIds.map(() => '?').join(', ');
  return db
    .prepare(`SELECT * FROM ${spec.name} WHERE ${spec.select.column} IN (${placeholders})`)
    .all(...parentIds) as Row[];
}

function collectMediaFor(
  spec: WorldTableSpec,
  rows: Row[],
  media: WorldMediaReader,
  files: Record<string, Uint8Array>,
): void {
  for (const row of rows) {
    for (const mediaColumn of spec.media ?? []) {
      const fileName = parseMediaFileName(row[mediaColumn.column], mediaColumn.host);
      if (fileName) {
        const zipPath = mediaZipPath(mediaColumn.host, fileName);
        if (!files[zipPath]) {
          const bytes = media.readMedia(mediaColumn.host, fileName);
          if (bytes) {
            files[zipPath] = bytes;
          }
        }
      }
    }
    if (spec.snapshot && typeof row.storage_key === 'string' && row.storage_key) {
      const zipPath = snapshotZipPath(row.storage_key);
      if (!files[zipPath]) {
        const bytes = media.readSnapshot(row.storage_key);
        if (bytes) {
          files[zipPath] = bytes;
        }
      }
    }
  }
}
