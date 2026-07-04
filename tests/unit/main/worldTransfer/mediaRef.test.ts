import { describe, expect, it } from 'vitest';
import {
  mediaZipPath,
  parseMediaFileName,
  snapshotZipPath,
} from '../../../../src/main/worldTransfer/mediaRef';

describe('parseMediaFileName', () => {
  it('extracts the file name from a canonical vv-media URL for the host', () => {
    expect(parseMediaFileName('vv-media://token-images/abc.png', 'token-images'))
      .toBe('abc.png');
  });

  it('decodes percent-encoded file names', () => {
    expect(parseMediaFileName('vv-media://world-images/a%20b.png', 'world-images'))
      .toBe('a b.png');
  });

  it('returns null for a URL that points at a different host', () => {
    expect(parseMediaFileName('vv-media://token-images/abc.png', 'world-images'))
      .toBeNull();
  });

  it('returns null for empty, non-string, or non-media values', () => {
    expect(parseMediaFileName(null, 'token-images')).toBeNull();
    expect(parseMediaFileName('', 'token-images')).toBeNull();
    expect(parseMediaFileName('https://example.com/x.png', 'token-images')).toBeNull();
  });
});

describe('zip path helpers', () => {
  it('nests media under media/<host>/', () => {
    expect(mediaZipPath('character-images', 'x.webp')).toBe('media/character-images/x.webp');
  });
  it('nests snapshots under world-maps/', () => {
    expect(snapshotZipPath('world-map-3.map.gz')).toBe('world-maps/world-map-3.map.gz');
  });
});
