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
    image_src: null,
    sections: JSON.stringify({ background: 'Outcasted from the Igni tribe.' }),
    wiki_summary: JSON.stringify({
      biographic: { mainEpithet: 'The Brandslayer' },
      personalDescription: { weight: '90kg (199lbs)' },
      statusDemographics: { primaryFaction: 'Constellation Company' },
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
    expect(flattened).toContain('outcasted from the igni tribe');
    expect(flattened).toContain('the brandslayer');
    expect(flattened).toContain('90kg (199lbs)');
    expect(flattened).toContain('constellation company');
    expect(flattened).toContain('half-blooded half-brain');
    expect(flattened).toContain('perfect primal');
  });

  it('handles malformed JSON in sections/wiki_summary gracefully', () => {
    const character = buildCharacter({ sections: '{bad', wiki_summary: '{bad' });
    expect(() => flattenCharacterForSearch(character)).not.toThrow();
  });
});

describe('characterMatchesQuery', () => {
  it('matches on a field value substring like a weight', () => {
    expect(characterMatchesQuery(buildCharacter(), '60kg')).toBe(false);
    expect(characterMatchesQuery(buildCharacter(), '90kg')).toBe(true);
  });

  it('matches on a faction name', () => {
    expect(characterMatchesQuery(buildCharacter(), 'Constellation Company')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(characterMatchesQuery(buildCharacter(), 'brandslayer')).toBe(true);
    expect(characterMatchesQuery(buildCharacter(), 'BRANDSLAYER')).toBe(true);
  });

  it('returns true for an empty query', () => {
    expect(characterMatchesQuery(buildCharacter(), '')).toBe(true);
    expect(characterMatchesQuery(buildCharacter(), '   ')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(characterMatchesQuery(buildCharacter(), 'nonexistent-value-xyz')).toBe(false);
  });
});
