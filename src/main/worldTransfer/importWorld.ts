/**
 * @role World import orchestrator
 * @owns Parsing a `.zip` bundle and inserting it as a brand-new world in one DB
 *   transaction: re-keying every row, rewriting FK columns (incl. JSON-embedded
 *   and deferred self-referential ones), and re-materializing media + snapshots.
 * @seam Main-process module; wires better-sqlite3 + fflate to the pure registry,
 *   manifest, idRemap, and mediaRef helpers. Covered by e2e (real SQLite).
 * @calls better-sqlite3 statements/transactions, fflate.unzipSync.
 *
 * Everything runs synchronously because a better-sqlite3 transaction cannot await;
 * the injected media writer must therefore write files with synchronous fs calls.
 */
import type Database from 'better-sqlite3';
import { unzipSync } from 'fflate';
import {
  createIdMapStore,
  type IdMapStore,
  remapForeignKeys,
  remapJsonForeignKeys,
  type Row,
} from './idRemap';
import { validateManifest, WorldImportError } from './manifest';
import { mediaZipPath, parseMediaFileName, snapshotZipPath } from './mediaRef';
import { type TableMedia, WORLD_TABLE_REGISTRY, type WorldTableSpec } from './tableRegistry';

/** Writes the binary bytes that live outside the DB, returning their new refs. */
export interface WorldMediaWriter {
  /** Persists a media file under `userData/<host>/` and returns its `vv-media://` URL. */
  writeMedia(host: string, originalFileName: string, bytes: Buffer): string;
  /** Persists a `.map.gz` snapshot for the new world-map id and returns its storage key. */
  writeSnapshot(worldMapId: number, bytes: Buffer): string;
}

export interface WorldImportResult {
  worldId: number;
  worldName: string;
}

export function importWorld(
  db: Database.Database,
  zipBytes: Uint8Array,
  media: WorldMediaWriter,
  isNameTaken: (name: string) => boolean,
): WorldImportResult {
  const unzipped = unzipSync(zipBytes);

  validateManifest(decodeEntry(unzipped['manifest.json']));

  const tables = parseTables(unzipped['data.json']);
  const worldRows = tables.worlds ?? [];
  if (worldRows.length !== 1) {
    throw new WorldImportError('The world bundle does not contain exactly one world.');
  }

  const sourceName = typeof worldRows[0].name === 'string' ? worldRows[0].name : 'Imported World';
  const finalName = resolveWorldName(sourceName, isNameTaken);

  const run = db.transaction((): WorldImportResult => {
    const ids = createIdMapStore();

    for (const spec of WORLD_TABLE_REGISTRY) {
      const rows = tables[spec.name] ?? [];
      for (const original of rows) {
        insertRegistryRow(db, spec, original, ids, media, unzipped, finalName);
      }
      applyDeferredForeignKeys(db, spec, rows, ids);
    }

    const worldId = ids.resolve('worlds', worldRows[0].id as number);
    if (worldId === undefined) {
      throw new WorldImportError('Failed to import world root row.');
    }
    return { worldId, worldName: finalName };
  });

  return run();
}

function parseTables(entry: Uint8Array | undefined): Record<string, Row[]> {
  const raw = decodeEntry(entry);
  if (raw === undefined) {
    throw new WorldImportError('The world bundle is missing its data file.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WorldImportError('The world bundle data file is corrupt (invalid JSON).');
  }
  const tables = (parsed as { tables?: unknown; }).tables;
  if (typeof tables !== 'object' || tables === null) {
    throw new WorldImportError('The world bundle data file has no tables.');
  }
  return tables as Record<string, Row[]>;
}

function insertRegistryRow(
  db: Database.Database,
  spec: WorldTableSpec,
  original: Row,
  ids: IdMapStore,
  media: WorldMediaWriter,
  unzipped: Record<string, Uint8Array>,
  finalName: string,
): void {
  let row = remapForeignKeys(original, spec, ids);
  row = remapJsonForeignKeys(row, spec, ids);

  if (spec.select.by === 'root') {
    row = { ...row, name: finalName };
  }
  for (const mediaColumn of spec.media ?? []) {
    row = {
      ...row,
      [mediaColumn.column]: rewriteMedia(original, mediaColumn, media, unzipped),
    };
  }

  const newId = insertRow(db, spec.name, row);
  ids.record(spec.name, original.id as number, newId);

  if (spec.snapshot) {
    applySnapshot(db, original, newId, media, unzipped);
  }
}

/** Returns the new media URL for a row's media column, or the original if it is not a copied file. */
function rewriteMedia(
  original: Row,
  mediaSpec: TableMedia,
  media: WorldMediaWriter,
  unzipped: Record<string, Uint8Array>,
): unknown {
  const { column, host } = mediaSpec;
  const fileName = parseMediaFileName(original[column], host);
  if (!fileName) {
    return original[column] ?? null;
  }
  const bytes = unzipped[mediaZipPath(host, fileName)];
  if (!bytes) {
    return null; // referenced file absent from bundle: drop the broken reference
  }
  return media.writeMedia(host, fileName, Buffer.from(bytes));
}

function applySnapshot(
  db: Database.Database,
  original: Row,
  newWorldMapId: number,
  media: WorldMediaWriter,
  unzipped: Record<string, Uint8Array>,
): void {
  const oldKey = original.storage_key;
  if (typeof oldKey !== 'string' || !oldKey) {
    return;
  }
  const bytes = unzipped[snapshotZipPath(oldKey)];
  if (!bytes) {
    return; // snapshot file absent: leave storage_key pointing at nothing (harmless)
  }
  const newKey = media.writeSnapshot(newWorldMapId, Buffer.from(bytes));
  db.prepare('UPDATE world_maps SET storage_key = ? WHERE id = ?').run(newKey, newWorldMapId);
}

function applyDeferredForeignKeys(
  db: Database.Database,
  spec: WorldTableSpec,
  rows: Row[],
  ids: IdMapStore,
): void {
  const deferred = (spec.foreignKeys ?? []).filter((fk) => fk.deferred);
  if (deferred.length === 0) {
    return;
  }
  for (const fk of deferred) {
    const update = db.prepare(`UPDATE ${spec.name} SET ${fk.column} = ? WHERE id = ?`);
    for (const original of rows) {
      const oldValue = original[fk.column];
      if (oldValue === null || oldValue === undefined) {
        continue;
      }
      const newRowId = ids.resolve(spec.name, original.id as number);
      const newTarget = ids.resolve(fk.references, oldValue as number);
      if (newRowId !== undefined && newTarget !== undefined) {
        update.run(newTarget, newRowId);
      }
    }
  }
}

function insertRow(db: Database.Database, table: string, row: Row): number {
  const columns = Object.keys(row).filter((column) => column !== 'id');
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((column) => bindable(row[column]));
  const info = db
    .prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
    .run(...values);
  return Number(info.lastInsertRowid);
}

/** Coerces JSON-parsed values into types better-sqlite3 can bind. */
function bindable(value: unknown): number | string | bigint | Buffer | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  // Nested object/array that is not a JSON-text column: store as JSON text.
  return JSON.stringify(value);
}

function resolveWorldName(sourceName: string, isNameTaken: (name: string) => boolean): string {
  if (!isNameTaken(sourceName)) {
    return sourceName;
  }
  const base = `${sourceName} (imported)`;
  if (!isNameTaken(base)) {
    return base;
  }
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${sourceName} (imported ${n})`;
    if (!isNameTaken(candidate)) {
      return candidate;
    }
  }
  return `${sourceName} (imported ${Date.now()})`;
}

function decodeEntry(entry: Uint8Array | undefined): string | undefined {
  return entry ? new TextDecoder().decode(entry) : undefined;
}
