import { describe, expect, it } from 'vitest';
import {
  normalizeAnyMediaImageSrc,
  normalizeMediaImageSrcForHost,
} from '../../../src/shared/media/imageSource';

describe('imageSource policy', () => {
  describe('normalizeMediaImageSrcForHost', () => {
    it('returns null for nullish and blank values', () => {
      expect(normalizeMediaImageSrcForHost(null, 'token-images')).toBeNull();
      expect(normalizeMediaImageSrcForHost(undefined, 'token-images')).toBeNull();
      expect(normalizeMediaImageSrcForHost('   ', 'token-images')).toBeNull();
    });

    it('keeps canonical vv-media URLs for matching host', () => {
      expect(
        normalizeMediaImageSrcForHost(
          'vv-media://token-images/dragon%20boss.png',
          'token-images',
        ),
      ).toBe('vv-media://token-images/dragon%20boss.png');
    });

    it('normalizes vv-media URLs with whitespace around them', () => {
      expect(
        normalizeMediaImageSrcForHost(
          '  vv-media://world-images/cover.png  ',
          'world-images',
        ),
      ).toBe('vv-media://world-images/cover.png');
    });

    it('rejects vv-media URLs for wrong host', () => {
      expect(
        normalizeMediaImageSrcForHost(
          'vv-media://world-images/cover.png',
          'token-images',
        ),
      ).toBeNull();
    });

    it('rejects vv-media URLs with nested paths', () => {
      expect(
        normalizeMediaImageSrcForHost(
          'vv-media://token-images/folder/dragon.png',
          'token-images',
        ),
      ).toBeNull();
    });

    it('converts legacy file URLs for matching host', () => {
      expect(
        normalizeMediaImageSrcForHost(
          'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/token-images/dragon.png',
          'token-images',
        ),
      ).toBe('vv-media://token-images/dragon.png');
      expect(
        normalizeMediaImageSrcForHost(
          'file:///Users/bill/Library/Application%20Support/Verse%20Vault/world-images/cover art.webp',
          'world-images',
        ),
      ).toBe('vv-media://world-images/cover%20art.webp');
    });

    it('rejects unsupported external and relative URLs', () => {
      expect(
        normalizeMediaImageSrcForHost('https://cdn.example.com/token.png', 'token-images'),
      ).toBeNull();
      expect(
        normalizeMediaImageSrcForHost('http://example.com/token.png', 'token-images'),
      ).toBeNull();
      expect(
        normalizeMediaImageSrcForHost('./token.png', 'token-images'),
      ).toBeNull();
      expect(
        normalizeMediaImageSrcForHost('data:image/png;base64,abc', 'token-images'),
      ).toBeNull();
    });

    it('rejects malformed file URLs and mismatched legacy folders', () => {
      expect(
        normalizeMediaImageSrcForHost('file://[broken-url', 'token-images'),
      ).toBeNull();
      expect(
        normalizeMediaImageSrcForHost(
          'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/world-images/cover.png',
          'token-images',
        ),
      ).toBeNull();
    });
  });

  describe('normalizeAnyMediaImageSrc', () => {
    it('accepts canonical vv-media URLs for any supported host', () => {
      expect(
        normalizeAnyMediaImageSrc('vv-media://background-images/mist.png'),
      ).toBe('vv-media://background-images/mist.png');
      expect(
        normalizeAnyMediaImageSrc('vv-media://lore-note-images/history.png'),
      ).toBe('vv-media://lore-note-images/history.png');
    });

    it('converts matching legacy file URLs for any supported host', () => {
      expect(
        normalizeAnyMediaImageSrc(
          'file:///C:/Users/Bill/AppData/Roaming/Verse%20Vault/faction-images/banner.png',
        ),
      ).toBe('vv-media://faction-images/banner.png');
    });

    it('rejects unsupported external URLs for all hosts', () => {
      expect(
        normalizeAnyMediaImageSrc('https://assets.example/offline-breaker.png'),
      ).toBeNull();
    });
  });
});
