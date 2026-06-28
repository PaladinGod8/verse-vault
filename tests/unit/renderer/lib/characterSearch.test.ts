import { describe, expect, it } from 'vitest';
import {
  characterMatchesQuery,
  flattenCharacterForSearch,
} from '../../../../src/renderer/lib/characterSearch';

function buildCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 1,
    world_id: 1,
    name: 'Ledros Igni',
    profile: 'A bitter dragonborn seeking vengeance.',
    author: 'GamingGator',
    image_src: null,
    sections: JSON.stringify({ background: 'Outcasted from the Igni tribe.' }),
    wiki_summary: JSON.stringify({
      biographic: { mainEpithet: 'The Brandslayer' },
      personalDescription: { weight: '90kg (199lbs)' },
      aliases: [{ text: 'Half-Blooded Half-Brain', note: 'by Igni Tribe' }],
      conditions: ['Perfect Primal', 'Amputee (Right Hand)'],
    }),
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('flattenCharacterForSearch', () => {
  it('includes name, profile, sections, and nested wiki_summary leaf values', () => {
    const flattened = flattenCharacterForSearch(buildCharacter());

    expect(flattened).toContain('ledros igni');
    expect(flattened).toContain('a bitter dragonborn seeking vengeance');
    expect(flattened).toContain('gaminggator');
    expect(flattened).toContain('outcasted from the igni tribe');
    expect(flattened).toContain('the brandslayer');
    expect(flattened).toContain('90kg (199lbs)');
    expect(flattened).toContain('half-blooded half-brain');
    expect(flattened).toContain('perfect primal');
  });

  it('handles malformed JSON in sections/wiki_summary gracefully', () => {
    const character = buildCharacter({ sections: '{bad', wiki_summary: '{bad' });
    expect(() => flattenCharacterForSearch(character)).not.toThrow();
  });
});

function buildFaction(overrides?: Partial<Faction>): Faction {
  return {
    id: 1,
    world_id: 1,
    name: 'Constellation Company',
    profile: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    type_id: null,
    parent_faction_id: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('characterMatchesQuery', () => {
  it('matches on a field value substring like a weight (no faction context)', () => {
    expect(characterMatchesQuery(buildCharacter(), '60kg', new Map(), [])).toBe(false);
    expect(characterMatchesQuery(buildCharacter(), '90kg', new Map(), [])).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(characterMatchesQuery(buildCharacter(), 'brandslayer', new Map(), [])).toBe(true);
    expect(characterMatchesQuery(buildCharacter(), 'BRANDSLAYER', new Map(), [])).toBe(true);
  });

  it('returns true for an empty query', () => {
    expect(characterMatchesQuery(buildCharacter(), '', new Map(), [])).toBe(true);
    expect(characterMatchesQuery(buildCharacter(), '   ', new Map(), [])).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(characterMatchesQuery(buildCharacter(), 'nonexistent-value-xyz', new Map(), [])).toBe(
      false,
    );
  });

  it('matches exactly on the character primary faction name, additively', () => {
    const character = buildCharacter();
    const primaryFaction = buildFaction({ id: 5, name: 'Constellation Company' });
    const primaryFactionByCharacterId = new Map([[character.id, 5]]);

    expect(
      characterMatchesQuery(character, 'Constellation Company', primaryFactionByCharacterId, [
        primaryFaction,
      ]),
    ).toBe(true);
    expect(
      characterMatchesQuery(character, 'constellation company', primaryFactionByCharacterId, [
        primaryFaction,
      ]),
    ).toBe(true);
  });

  it('matches on a partial (substring) primary faction name', () => {
    const character = buildCharacter();
    const primaryFaction = buildFaction({ id: 5, name: 'Constellation Company' });
    const primaryFactionByCharacterId = new Map([[character.id, 5]]);

    expect(
      characterMatchesQuery(character, 'Constellation', primaryFactionByCharacterId, [
        primaryFaction,
      ]),
    ).toBe(true);
    expect(
      characterMatchesQuery(character, 'cult', primaryFactionByCharacterId, [
        primaryFaction,
      ]),
    ).toBe(false);
  });

  it('matches when the query is a substring of an ancestor faction name', () => {
    const character = buildCharacter();
    const parentFaction = buildFaction({ id: 1, name: 'Cult of Contagion' });
    const primaryFaction = buildFaction({ id: 5, name: 'Inner Cell', parent_faction_id: 1 });
    const primaryFactionByCharacterId = new Map([[character.id, 5]]);

    expect(
      characterMatchesQuery(character, 'Cult of Contagion', primaryFactionByCharacterId, [
        parentFaction,
        primaryFaction,
      ]),
    ).toBe(true);
    expect(
      characterMatchesQuery(character, 'cult', primaryFactionByCharacterId, [
        parentFaction,
        primaryFaction,
      ]),
    ).toBe(true);
  });

  it('does not break existing substring matching when no primary faction is set', () => {
    const character = buildCharacter();
    expect(characterMatchesQuery(character, '90kg', new Map(), [])).toBe(true);
    expect(characterMatchesQuery(character, 'Some Faction', new Map(), [])).toBe(false);
  });
});
