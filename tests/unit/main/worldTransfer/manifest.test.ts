import { describe, expect, it } from 'vitest';
import {
  buildManifest,
  FORMAT_VERSION,
  validateManifest,
  WorldImportError,
} from '../../../../src/main/worldTransfer/manifest';

describe('buildManifest', () => {
  it('captures the current format version, world name, counts, and an ISO timestamp', () => {
    const manifest = buildManifest({
      worldName: 'Aetheria',
      tableCounts: { worlds: 1, characters: 3 },
      appVersion: '1.0.0',
    });

    expect(manifest.formatVersion).toBe(FORMAT_VERSION);
    expect(manifest.worldName).toBe('Aetheria');
    expect(manifest.tableCounts).toEqual({ worlds: 1, characters: 3 });
    expect(manifest.app).toContain('Verse Vault');
    expect(() => new Date(manifest.exportedAt).toISOString()).not.toThrow();
    expect(Number.isNaN(Date.parse(manifest.exportedAt))).toBe(false);
  });
});

describe('validateManifest', () => {
  const good = () =>
    JSON.stringify(buildManifest({
      worldName: 'Aetheria',
      tableCounts: { worlds: 1 },
      appVersion: '1.0.0',
    }));

  it('accepts a manifest written by the same major version', () => {
    const manifest = validateManifest(good());
    expect(manifest.worldName).toBe('Aetheria');
  });

  it('tolerates unknown extra fields (forward-compatible minor changes)', () => {
    const withExtra = JSON.stringify({
      ...JSON.parse(good()),
      somethingNewInAFutureMinor: 42,
    });
    expect(() => validateManifest(withExtra)).not.toThrow();
  });

  it('refuses a manifest exported by a newer major version', () => {
    const newer = JSON.stringify({
      ...JSON.parse(good()),
      formatVersion: FORMAT_VERSION + 1,
    });
    expect(() => validateManifest(newer)).toThrow(WorldImportError);
    expect(() => validateManifest(newer)).toThrow(/newer version/i);
  });

  it('refuses a missing/undefined manifest', () => {
    expect(() => validateManifest(undefined)).toThrow(WorldImportError);
    expect(() => validateManifest(undefined)).toThrow(/manifest/i);
  });

  it('refuses invalid JSON', () => {
    expect(() => validateManifest('{ not json')).toThrow(WorldImportError);
  });

  it('refuses a manifest with a missing or non-numeric formatVersion', () => {
    expect(() => validateManifest(JSON.stringify({ worldName: 'x' }))).toThrow(
      WorldImportError,
    );
    expect(() => validateManifest(JSON.stringify({ formatVersion: 'one', worldName: 'x' })))
      .toThrow(WorldImportError);
  });
});
