import { describe, expect, it } from 'vitest';
import { loreNoteMatchesQuery } from '../../../../src/renderer/lib/loreNoteSearch';

function buildLoreNote(overrides?: Partial<LoreNote>): LoreNote {
  return {
    id: 1,
    world_id: 1,
    name: 'Founding Myth',
    content: 'The city was built on a trade agreement between two rival houses.',
    image_src: null,
    canvas_enabled: false,
    canvas_scene: null,
    canvas_preview_image: null,
    tags: ['Economics', 'History'],
    last_viewed_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('loreNoteMatchesQuery', () => {
  it('returns true for a blank query', () => {
    expect(loreNoteMatchesQuery(buildLoreNote(), '')).toBe(true);
    expect(loreNoteMatchesQuery(buildLoreNote(), '   ')).toBe(true);
  });

  it('matches name substrings case-insensitively', () => {
    expect(loreNoteMatchesQuery(buildLoreNote(), 'founding')).toBe(true);
    expect(loreNoteMatchesQuery(buildLoreNote(), 'FOUNDING')).toBe(true);
    expect(loreNoteMatchesQuery(buildLoreNote(), 'nonexistent')).toBe(false);
  });

  it('matches content substrings', () => {
    expect(loreNoteMatchesQuery(buildLoreNote(), 'rival houses')).toBe(true);
  });

  it('handles a null content field gracefully', () => {
    expect(() => loreNoteMatchesQuery(buildLoreNote({ content: null }), 'anything')).not.toThrow();
    expect(loreNoteMatchesQuery(buildLoreNote({ content: null }), 'founding')).toBe(true);
  });

  it('matches a #tag token exactly, case-insensitively', () => {
    expect(loreNoteMatchesQuery(buildLoreNote(), '#Economics')).toBe(true);
    expect(loreNoteMatchesQuery(buildLoreNote(), '#economics')).toBe(true);
    expect(loreNoteMatchesQuery(buildLoreNote(), '#ECONOMICS')).toBe(true);
  });

  it('does not substring-match a #tag token', () => {
    expect(loreNoteMatchesQuery(buildLoreNote(), '#econ')).toBe(false);
    expect(loreNoteMatchesQuery(buildLoreNote(), '#Economic-Policy')).toBe(false);
  });

  it('returns false when the note has no tags but query has a tag token', () => {
    expect(loreNoteMatchesQuery(buildLoreNote({ tags: [] }), '#Economics')).toBe(false);
  });

  it('ANDs mixed text and tag tokens', () => {
    const note = buildLoreNote();
    expect(loreNoteMatchesQuery(note, 'founding #Economics')).toBe(true);
    expect(loreNoteMatchesQuery(note, 'founding #Magic')).toBe(false);
    expect(loreNoteMatchesQuery(note, 'nonexistent #Economics')).toBe(false);
  });

  it('requires every tag token to match when multiple are given', () => {
    const note = buildLoreNote();
    expect(loreNoteMatchesQuery(note, '#Economics #History')).toBe(true);
    expect(loreNoteMatchesQuery(note, '#Economics #Magic')).toBe(false);
  });
});
