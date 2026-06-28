import { describe, expect, it } from 'vitest';
import {
  factionMatchesQuery,
  flattenFactionForSearch,
} from '../../../../src/renderer/lib/factionSearch';

function buildFaction(overrides?: Partial<Faction>): Faction {
  return {
    id: 1,
    world_id: 1,
    name: 'Cult of Contagion',
    profile: 'A biohazard cult seeking dominion.',
    image_src: null,
    sections: JSON.stringify({ history: 'Founded in Fort Fabalta.' }),
    wiki_summary: JSON.stringify({
      status: 'Active',
      headquarters: 'Fort Fabalta, Occult',
      aliases: ['Cabinet of Contagion', 'ABC'],
    }),
    type_id: null,
    parent_faction_id: null,
    last_viewed_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('flattenFactionForSearch', () => {
  it('includes name, profile, sections, and nested wiki_summary leaf values', () => {
    const flattened = flattenFactionForSearch(buildFaction());

    expect(flattened).toContain('cult of contagion');
    expect(flattened).toContain('a biohazard cult seeking dominion');
    expect(flattened).toContain('founded in fort fabalta');
    expect(flattened).toContain('fort fabalta, occult');
    expect(flattened).toContain('cabinet of contagion');
  });

  it('handles malformed JSON gracefully', () => {
    const faction = buildFaction({ sections: '{bad', wiki_summary: '{bad' });
    expect(() => flattenFactionForSearch(faction)).not.toThrow();
  });
});

describe('factionMatchesQuery', () => {
  it('matches on a substring field value', () => {
    expect(factionMatchesQuery(buildFaction(), 'Fort Fabalta', [buildFaction()])).toBe(true);
    expect(factionMatchesQuery(buildFaction(), 'nonexistent-xyz', [buildFaction()])).toBe(false);
  });

  it('returns true for an empty query', () => {
    expect(factionMatchesQuery(buildFaction(), '', [buildFaction()])).toBe(true);
  });

  it('surfaces all descendants when the query exactly matches an ancestor name', () => {
    const parent = buildFaction({ id: 1, name: 'Cult of Contagion' });
    const child = buildFaction({ id: 2, name: 'Fort Fabalta Cell', parent_faction_id: 1 });
    const grandchild = buildFaction({
      id: 3,
      name: 'Inner Circle',
      parent_faction_id: 2,
    });
    const unrelated = buildFaction({ id: 4, name: 'Lone Wolves', parent_faction_id: null });
    const allFactions = [parent, child, grandchild, unrelated];

    expect(factionMatchesQuery(parent, 'Cult of Contagion', allFactions)).toBe(true);
    expect(factionMatchesQuery(child, 'Cult of Contagion', allFactions)).toBe(true);
    expect(factionMatchesQuery(grandchild, 'Cult of Contagion', allFactions)).toBe(true);
    expect(factionMatchesQuery(unrelated, 'Cult of Contagion', allFactions)).toBe(false);
  });

  it('is case-insensitive for the ancestor exact-match expansion', () => {
    const parent = buildFaction({ id: 1, name: 'Cult of Contagion' });
    const child = buildFaction({ id: 2, name: 'Cell', parent_faction_id: 1 });
    const allFactions = [parent, child];

    expect(factionMatchesQuery(child, 'cult of contagion', allFactions)).toBe(true);
    expect(factionMatchesQuery(child, 'CULT OF CONTAGION', allFactions)).toBe(true);
  });

  it('expands to descendants on a partial (substring) ancestor name match', () => {
    const parent = buildFaction({ id: 1, name: 'Cult of Contagion' });
    const child = buildFaction({
      id: 2,
      name: 'Cell',
      parent_faction_id: 1,
      profile: 'unrelated profile text',
      sections: '{}',
      wiki_summary: '{}',
    });
    const allFactions = [parent, child];

    // "Cult" is a substring of the parent's name, so the child (which has no "Cult"
    // substring anywhere in its own fields) should still match via the ancestor.
    expect(factionMatchesQuery(child, 'Cult', allFactions)).toBe(true);
    expect(factionMatchesQuery(child, 'nonexistent-xyz', allFactions)).toBe(false);
  });
});
