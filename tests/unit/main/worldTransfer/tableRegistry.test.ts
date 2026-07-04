import { describe, expect, it } from 'vitest';
import {
  EXCLUDED_TABLES,
  WORLD_TABLE_REGISTRY,
} from '../../../../src/main/worldTransfer/tableRegistry';
import { MEDIA_IMAGE_HOSTS } from '../../../../src/shared/media/imageSource';

describe('WORLD_TABLE_REGISTRY', () => {
  const names = WORLD_TABLE_REGISTRY.map((spec) => spec.name);
  const indexOf = (name: string) => names.indexOf(name);

  it('starts at the world root', () => {
    expect(WORLD_TABLE_REGISTRY[0].name).toBe('worlds');
    expect(WORLD_TABLE_REGISTRY[0].select.by).toBe('root');
  });

  it('has no duplicate table entries', () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it('excludes app_settings and the legacy verses table', () => {
    for (const excluded of EXCLUDED_TABLES) {
      expect(names).not.toContain(excluded);
    }
    expect(EXCLUDED_TABLES).toContain('app_settings');
    expect(EXCLUDED_TABLES).toContain('verses');
  });

  it('references only tables that exist in the registry', () => {
    for (const spec of WORLD_TABLE_REGISTRY) {
      for (const fk of spec.foreignKeys ?? []) {
        expect(names).toContain(fk.references);
      }
      for (const jsonFk of spec.jsonForeignKeys ?? []) {
        expect(names).toContain(jsonFk.references);
      }
      if (spec.select.by === 'parent') {
        expect(names).toContain(spec.select.parentTable);
      }
    }
  });

  it('orders every table after its non-deferred FK targets and its parent', () => {
    WORLD_TABLE_REGISTRY.forEach((spec, index) => {
      for (const fk of spec.foreignKeys ?? []) {
        if (fk.deferred || fk.references === spec.name) {
          continue;
        }
        expect(indexOf(fk.references)).toBeLessThan(index);
      }
      for (const jsonFk of spec.jsonForeignKeys ?? []) {
        expect(indexOf(jsonFk.references)).toBeLessThan(index);
      }
      if (spec.select.by === 'parent') {
        expect(indexOf(spec.select.parentTable)).toBeLessThan(index);
      }
    });
  });

  it('marks the self-referential factions parent FK as deferred', () => {
    const factions = WORLD_TABLE_REGISTRY.find((s) => s.name === 'factions');
    const selfFk = factions?.foreignKeys?.find(
      (fk) => fk.column === 'parent_faction_id',
    );
    expect(selfFk).toBeDefined();
    expect(selfFk?.references).toBe('factions');
    expect(selfFk?.deferred).toBe(true);
  });

  it('remaps the battlemap id embedded in the scenes payload JSON', () => {
    const scenes = WORLD_TABLE_REGISTRY.find((s) => s.name === 'scenes');
    const jsonFk = scenes?.jsonForeignKeys?.[0];
    expect(jsonFk?.references).toBe('battlemaps');
    expect(jsonFk?.path).toEqual(['runtime', 'battlemap_id']);
  });

  it('only uses known media hosts', () => {
    for (const spec of WORLD_TABLE_REGISTRY) {
      if (spec.media) {
        expect(MEDIA_IMAGE_HOSTS).toContain(spec.media.host);
      }
    }
  });

  it('includes every world-scoped table that carries binary media or a world map snapshot', () => {
    const mediaTables = WORLD_TABLE_REGISTRY.filter((s) => s.media).map((s) => s.name);
    expect(mediaTables).toEqual(
      expect.arrayContaining([
        'worlds',
        'tokens',
        'characters',
        'backgrounds',
        'items',
        'factions',
        'lore_notes',
      ]),
    );
    const snapshotTables = WORLD_TABLE_REGISTRY.filter((s) => s.snapshot).map((s) => s.name);
    expect(snapshotTables).toEqual(['world_maps']);
  });
});
