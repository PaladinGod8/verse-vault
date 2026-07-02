import { describe, expect, it } from 'vitest';
import { normalizeTokenImageSrc } from '../../../src/renderer/lib/tokenImageSrc';

describe('normalizeTokenImageSrc', () => {
  describe('null/undefined inputs', () => {
    it('returns null for null input', () => {
      expect(normalizeTokenImageSrc(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(normalizeTokenImageSrc(undefined)).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(normalizeTokenImageSrc(123 as unknown as string)).toBeNull();
      expect(normalizeTokenImageSrc({} as unknown as string)).toBeNull();
      expect(normalizeTokenImageSrc([] as unknown as string)).toBeNull();
    });
  });

  describe('empty strings', () => {
    it('returns null for empty string', () => {
      expect(normalizeTokenImageSrc('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(normalizeTokenImageSrc('   ')).toBeNull();
      expect(normalizeTokenImageSrc('\t\n')).toBeNull();
    });
  });

  describe('already prefixed URLs', () => {
    it('returns vv-media:// prefixed URLs unchanged', () => {
      const url = 'vv-media://token-images/dragon.png';
      expect(normalizeTokenImageSrc(url)).toBe(url);
    });

    it('returns vv-media:// prefixed URLs with complex names unchanged', () => {
      const url = 'vv-media://token-images/my-token_image%20file.png';
      expect(normalizeTokenImageSrc(url)).toBe(url);
    });
  });

  describe('non-file:// URLs', () => {
    it('rejects http:// URLs', () => {
      const url = 'http://example.com/image.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects https:// URLs', () => {
      const url = 'https://example.com/image.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects data: URLs', () => {
      const url = 'data:image/png;base64,iVBORw0KGgo...';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects relative paths', () => {
      const url = './images/token.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects URLs with custom schemes', () => {
      const url = 'custom://resource.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });
  });

  describe('file:// URLs conversion', () => {
    it('converts file:// URL with token-images path', () => {
      const url = 'file:///C:/Users/user/token-images/dragon.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/dragon.png');
    });

    it('converts file:// URL with encoded token-images path', () => {
      const url = 'file:///C:/Users/user/token-images/dragon%20blue.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/dragon%20blue.png');
    });

    it('converts file:// URL on Unix-like paths', () => {
      const url = 'file:///home/user/token-images/minotaur.jpg';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/minotaur.jpg');
    });

    it('converts file:// URL with complex filename', () => {
      const url = 'file:///D:/data/token-images/enemy_2024-01-15.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/enemy_2024-01-15.png');
    });

    it('handles file:// URL with multiple token-images occurrences (matches last)', () => {
      // The regex matches the last occurrence of /token-images/([^/]+)$
      const url = 'file:///C:/token-images/backup/token-images/final.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/final.png');
    });

    it('encodes special characters in filename', () => {
      const url = 'file:///C:/Users/user/token-images/dragon (boss).png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toContain('vv-media://token-images/');
      // The filename will be percent-encoded with %20 for space
      expect(result).toBe('vv-media://token-images/dragon%20(boss).png');
    });
  });

  describe('file:// URLs without token-images path', () => {
    it('rejects file:// URL if it does not map to supported local image folders', () => {
      const url = 'file:///C:/Users/user/images/dragon.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects file:// URL if folder only resembles supported host', () => {
      const url = 'file:///C:/Users/mytoken-images-backup/dragon.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });
  });

  describe('invalid URLs', () => {
    it('rejects malformed file:// URL gracefully', () => {
      const url = 'file://[invalid-url-chars]';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects file:// URL with percent-encoding errors gracefully', () => {
      const url = 'file:///C:/Users/user/token-images/%ZZ_invalid.png';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });
  });

  describe('whitespace handling', () => {
    it('trims before rejecting unsupported URLs', () => {
      const url = '  https://example.com/image.png  ';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('trims tabs and newlines before rejecting unsupported URLs', () => {
      const url = '\t\nhttps://example.com/image.png\n\t';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });
  });

  describe('case insensitivity for pattern matching', () => {
    it('matches TOKEN-IMAGES in uppercase', () => {
      const url = 'file:///C:/Users/user/TOKEN-IMAGES/dragon.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/dragon.png');
    });

    it('matches mixed case token-images path', () => {
      const url = 'file:///C:/Users/user/Token-Images/dragon.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/dragon.png');
    });
  });

  describe('real-world scenarios', () => {
    it('handles Windows full path', () => {
      const url =
        'file:///C:/Users/DnDMaster/AppData/Local/verse-vault/token-images/goblin_archer.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/goblin_archer.png');
    });

    it('handles Linux full path', () => {
      const url = 'file:///home/user/.local/share/verse-vault/token-images/orc_warrior.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/orc_warrior.png');
    });

    it('handles macOS full path', () => {
      const url =
        'file:///Users/user/Library/Application%20Support/verse-vault/token-images/elf_rogue.png';
      const result = normalizeTokenImageSrc(url);
      expect(result).toBe('vv-media://token-images/elf_rogue.png');
    });

    it('rejects image URLs from web', () => {
      const url = 'https://cdn.example.com/tokens/dragon.webp';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('rejects image URLs from relative paths', () => {
      const url = '../assets/tokens/wizard.svg';
      expect(normalizeTokenImageSrc(url)).toBeNull();
    });

    it('handles non-token legacy file URLs for supported local image folders', () => {
      const url =
        'file:///C:/Users/DnDMaster/AppData/Roaming/Verse%20Vault/faction-images/banner.png';
      expect(normalizeTokenImageSrc(url)).toBe(
        'vv-media://faction-images/banner.png',
      );
    });
  });
});
