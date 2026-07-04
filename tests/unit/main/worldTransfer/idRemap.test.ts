import { describe, expect, it } from 'vitest';
import {
  createIdMapStore,
  remapForeignKeys,
  remapJsonForeignKeys,
  type Row,
} from '../../../../src/main/worldTransfer/idRemap';
import type { WorldTableSpec } from '../../../../src/main/worldTransfer/tableRegistry';

function store(seed: Record<string, Array<[number, number]>>) {
  const s = createIdMapStore();
  for (const [table, pairs] of Object.entries(seed)) {
    for (const [oldId, newId] of pairs) {
      s.record(table, oldId, newId);
    }
  }
  return s;
}

describe('remapForeignKeys', () => {
  const tokenSpec: WorldTableSpec = {
    name: 'tokens',
    select: { by: 'world' },
    foreignKeys: [
      { column: 'world_id', references: 'worlds' },
      { column: 'campaign_id', references: 'campaigns' },
    ],
  };

  it('rewrites FK columns to the newly assigned ids', () => {
    const ids = store({ worlds: [[5, 100]], campaigns: [[9, 200]] });
    const row = { id: 1, world_id: 5, campaign_id: 9, name: 'Goblin' };

    const result = remapForeignKeys(row, tokenSpec, ids);

    expect(result.world_id).toBe(100);
    expect(result.campaign_id).toBe(200);
    expect(result.name).toBe('Goblin');
  });

  it('leaves null FK values as null', () => {
    const ids = store({ worlds: [[5, 100]] });
    const row: Row = { id: 1, world_id: 5, campaign_id: null, name: 'Loose' };

    expect(remapForeignKeys(row, tokenSpec, ids).campaign_id).toBeNull();
  });

  it('skips deferred FK columns (resolved in a later pass)', () => {
    const factionSpec: WorldTableSpec = {
      name: 'factions',
      select: { by: 'world' },
      foreignKeys: [
        { column: 'world_id', references: 'worlds' },
        { column: 'parent_faction_id', references: 'factions', deferred: true },
      ],
    };
    const ids = store({ worlds: [[5, 100]], factions: [[7, 700]] });
    const row = { id: 8, world_id: 5, parent_faction_id: 7 };

    const result = remapForeignKeys(row, factionSpec, ids);

    expect(result.world_id).toBe(100);
    expect(result.parent_faction_id).toBe(7); // unchanged; deferred
  });

  it('throws when a non-null FK id was never recorded', () => {
    const ids = store({ worlds: [[5, 100]] });
    const row = { id: 1, world_id: 5, campaign_id: 999, name: 'Orphan' };

    expect(() => remapForeignKeys(row, tokenSpec, ids)).toThrow(/campaign/i);
  });
});

describe('remapJsonForeignKeys', () => {
  const sceneSpec: WorldTableSpec = {
    name: 'scenes',
    select: { by: 'parent', parentTable: 'sessions', column: 'session_id' },
    foreignKeys: [{ column: 'session_id', references: 'sessions' }],
    jsonForeignKeys: [
      { column: 'payload', path: ['runtime', 'battlemap_id'], references: 'battlemaps' },
    ],
  };

  it('remaps an id nested inside a JSON text column', () => {
    const ids = store({ battlemaps: [[9, 200]] });
    const row = {
      id: 1,
      session_id: 1,
      payload: JSON.stringify({ runtime: { battlemap_id: 9 }, other: true }),
    };

    const result = remapJsonForeignKeys(row, sceneSpec, ids);

    expect(JSON.parse(result.payload as string)).toEqual({
      runtime: { battlemap_id: 200 },
      other: true,
    });
  });

  it('leaves the payload untouched when the nested id is null or absent', () => {
    const ids = store({ battlemaps: [[9, 200]] });
    const nullRow = { payload: JSON.stringify({ runtime: { battlemap_id: null } }) };
    const absentRow = { payload: JSON.stringify({ runtime: {} }) };

    expect(JSON.parse(remapJsonForeignKeys(nullRow, sceneSpec, ids).payload as string))
      .toEqual({ runtime: { battlemap_id: null } });
    expect(JSON.parse(remapJsonForeignKeys(absentRow, sceneSpec, ids).payload as string))
      .toEqual({ runtime: {} });
  });
});
