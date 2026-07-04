import { describe, expect, it } from 'vitest';
import config from '../../playwright.config';

describe('playwright project worker grouping', () => {
  it('defines smoke, medium, and runtime projects with expected parallelism', () => {
    const projects = config.projects;
    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);

    const byName = new Map(
      (projects ?? []).map((project) => [project.name, project]),
    );

    expect(byName.has('smoke')).toBe(true);
    expect(byName.has('medium')).toBe(true);
    expect(byName.has('runtime')).toBe(true);

    expect(byName.get('smoke')?.fullyParallel).toBe(true);
    expect(byName.get('medium')?.fullyParallel).toBe(true);
    expect(byName.get('runtime')?.fullyParallel).toBe(false);
  });

  it('assigns each e2e test file to exactly one project', () => {
    const projects = config.projects ?? [];
    const assigned = projects.flatMap((project) => {
      const matches = Array.isArray(project.testMatch)
        ? project.testMatch
        : [project.testMatch].filter(Boolean);
      return matches.map((match) => String(match));
    });

    const expected = [
      'abilities.test.ts',
      'app.test.ts',
      'offline-smoke.test.ts',
      'backgrounds.test.ts',
      'campaign-notes.test.ts',
      'cascade-integrity.test.ts',
      'character-detail.test.ts',
      'characters.test.ts',
      'items.test.ts',
      'loreNotes.test.ts',
      'rich-text-editor.test.ts',
      'narrative-chain.test.ts',
      'statblock-links.test.ts',
      'restart-persistence.test.ts',
      'media-import-roundtrip.test.ts',
      'token-move-scope.test.ts',
      'arc-act.test.ts',
      'battlemap-runtime-play.test.ts',
      'battlemap-runtime-statblock-popup.test.ts',
      'battlemaps.test.ts',
      'casting-range-overlay.test.ts',
      'factions.test.ts',
      'characterRelationships.test.ts',
      'factionRelationships.test.ts',
      'levels.test.ts',
      'scenes.test.ts',
      'sessions.test.ts',
      'statblock-statistics.test.ts',
      'statblocks-crud.test.ts',
      'statblocks.test.ts',
      'settings.test.ts',
      'tokenMove.test.ts',
      'tokens.test.ts',
      'tokens-runtime-palette.test.ts',
      'world-default-statistics.test.ts',
      'world-import-export.test.ts',
      'world-maps.test.ts',
      'worlds.test.ts',
      'world-statistics-config.test.ts',
    ];

    const uniqueAssigned = new Set(assigned);
    expect(uniqueAssigned.size).toBe(assigned.length);
    expect([...uniqueAssigned].sort()).toEqual(expected.sort());
  });
});
