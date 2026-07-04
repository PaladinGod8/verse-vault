/**
 * @role World-transfer id remapping
 * @owns Building the old->new id map during import and rewriting a row's foreign
 *   keys (plain columns and ids embedded in JSON) to the freshly assigned ids.
 * @seam Pure functions over plain row objects; no DB or Electron imports so they
 *   are unit-testable under the Node/vitest runner. exportWorld/importWorld wire
 *   these to better-sqlite3.
 * @calls Nothing at runtime.
 */
import type { WorldTableSpec } from './tableRegistry';

export type Row = Record<string, unknown>;

export interface IdMapStore {
  /** Remember that `oldId` in `table` became `newId` after insert. */
  record(table: string, oldId: number, newId: number): void;
  /** New id for `oldId` in `table`, or undefined if never recorded. */
  resolve(table: string, oldId: number): number | undefined;
}

export function createIdMapStore(): IdMapStore {
  const tables = new Map<string, Map<number, number>>();
  const mapFor = (table: string): Map<number, number> => {
    let m = tables.get(table);
    if (!m) {
      m = new Map();
      tables.set(table, m);
    }
    return m;
  };
  return {
    record(table, oldId, newId) {
      mapFor(table).set(oldId, newId);
    },
    resolve(table, oldId) {
      return tables.get(table)?.get(oldId);
    },
  };
}

/**
 * Returns a copy of `row` with each non-deferred foreign-key column rewritten to
 * its new id. Null keys stay null; deferred (self-referential) keys are left
 * untouched for a later pass. Throws when a non-null key was never recorded.
 */
export function remapForeignKeys(row: Row, spec: WorldTableSpec, ids: IdMapStore): Row {
  const next: Row = { ...row };
  for (const fk of spec.foreignKeys ?? []) {
    if (fk.deferred) {
      continue;
    }
    const value = next[fk.column];
    if (value === null || value === undefined) {
      continue;
    }
    const newId = ids.resolve(fk.references, value as number);
    if (newId === undefined) {
      throw new Error(
        `Cannot remap foreign key "${fk.column}" -> ${fk.references}: `
          + `id ${String(value)} was not present in the exported world.`,
      );
    }
    next[fk.column] = newId;
  }
  return next;
}

/**
 * Returns a copy of `row` with any ids embedded in JSON-text columns rewritten.
 * A path whose value is null/absent (or whose id was not recorded) is left as-is,
 * so partial or legacy payloads never break the import.
 */
export function remapJsonForeignKeys(row: Row, spec: WorldTableSpec, ids: IdMapStore): Row {
  const jsonFks = spec.jsonForeignKeys ?? [];
  if (jsonFks.length === 0) {
    return { ...row };
  }

  const next: Row = { ...row };
  for (const jsonFk of jsonFks) {
    const raw = next[jsonFk.column];
    if (typeof raw !== 'string' || raw.trim() === '') {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // malformed JSON: leave the column verbatim
    }

    if (rewriteNestedId(parsed, jsonFk.path, jsonFk.references, ids)) {
      next[jsonFk.column] = JSON.stringify(parsed);
    }
  }
  return next;
}

/** Walks `path` into `root`, remapping the terminal numeric id in place. */
function rewriteNestedId(
  root: unknown,
  path: string[],
  references: string,
  ids: IdMapStore,
): boolean {
  let node: unknown = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    if (typeof node !== 'object' || node === null) {
      return false;
    }
    node = (node as Record<string, unknown>)[path[i]];
  }
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  const leafKey = path[path.length - 1];
  const container = node as Record<string, unknown>;
  const value = container[leafKey];
  if (typeof value !== 'number') {
    return false;
  }

  const newId = ids.resolve(references, value);
  if (newId === undefined) {
    return false;
  }
  container[leafKey] = newId;
  return true;
}
