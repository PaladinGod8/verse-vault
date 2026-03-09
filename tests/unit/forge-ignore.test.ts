import { describe, expect, it } from 'vitest';
import { isIgnoredFromPackage, PACKAGE_INCLUDE } from '../../forge.ignore';

describe('PACKAGE_INCLUDE', () => {
  it('is a readonly array', () => {
    expect(
      typeof PACKAGE_INCLUDE === 'object' && Array.isArray(PACKAGE_INCLUDE),
    ).toBe(true);
  });

  it('contains /.vite', () => {
    expect(PACKAGE_INCLUDE.includes('/.vite')).toBe(true);
  });

  it('contains /node_modules/better-sqlite3', () => {
    expect(PACKAGE_INCLUDE.includes('/node_modules/better-sqlite3')).toBe(true);
  });

  it('contains /node_modules/electron-squirrel-startup', () => {
    expect(
      PACKAGE_INCLUDE.includes('/node_modules/electron-squirrel-startup'),
    ).toBe(true);
  });

  it('contains /package.json', () => {
    expect(PACKAGE_INCLUDE.includes('/package.json')).toBe(true);
  });

  it('does not contain bare /node_modules', () => {
    expect(PACKAGE_INCLUDE).not.toContain('/node_modules');
  });
});

describe('isIgnoredFromPackage', () => {
  describe('root path', () => {
    it('returns false for empty string (root)', () => {
      expect(isIgnoredFromPackage('')).toBe(false);
    });
  });

  describe('included paths — should NOT be ignored', () => {
    it('returns false for /.vite', () => {
      expect(isIgnoredFromPackage('/.vite')).toBe(false);
    });

    it('returns false for /.vite/build/main.js', () => {
      expect(isIgnoredFromPackage('/.vite/build/main.js')).toBe(false);
    });

    it('returns false for /.vite/renderer/main_window/index.html', () => {
      expect(
        isIgnoredFromPackage('/.vite/renderer/main_window/index.html'),
      ).toBe(false);
    });

    it('returns false for /node_modules/better-sqlite3', () => {
      expect(isIgnoredFromPackage('/node_modules/better-sqlite3')).toBe(false);
    });

    it('returns false for /node_modules/better-sqlite3/build/Release/better_sqlite3.node', () => {
      expect(
        isIgnoredFromPackage(
          '/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
        ),
      ).toBe(false);
    });

    it('returns false for /node_modules/electron-squirrel-startup', () => {
      expect(
        isIgnoredFromPackage('/node_modules/electron-squirrel-startup'),
      ).toBe(false);
    });

    it('returns false for /node_modules/electron-squirrel-startup/index.js', () => {
      expect(
        isIgnoredFromPackage(
          '/node_modules/electron-squirrel-startup/index.js',
        ),
      ).toBe(false);
    });

    it('returns false for /package.json', () => {
      expect(isIgnoredFromPackage('/package.json')).toBe(false);
    });
  });

  describe('excluded paths — should BE ignored', () => {
    it('returns true for /src/main.ts', () => {
      expect(isIgnoredFromPackage('/src/main.ts')).toBe(true);
    });

    it('returns true for /docs/01_ARCHITECTURE.md', () => {
      expect(isIgnoredFromPackage('/docs/01_ARCHITECTURE.md')).toBe(true);
    });

    it('returns true for /node_modules/react', () => {
      expect(isIgnoredFromPackage('/node_modules/react')).toBe(true);
    });

    it('returns true for /node_modules/react/index.js', () => {
      expect(isIgnoredFromPackage('/node_modules/react/index.js')).toBe(true);
    });

    it('returns true for /node_modules/pixi.js/dist/pixi.js', () => {
      expect(isIgnoredFromPackage('/node_modules/pixi.js/dist/pixi.js')).toBe(
        true,
      );
    });

    it('returns true for /node_modules/zustand/index.js', () => {
      expect(isIgnoredFromPackage('/node_modules/zustand/index.js')).toBe(true);
    });

    it('returns true for /node_modules/@dnd-kit/core/dist/index.js', () => {
      expect(
        isIgnoredFromPackage('/node_modules/@dnd-kit/core/dist/index.js'),
      ).toBe(true);
    });

    it('returns true for /node_modules/typescript/lib/typescript.js', () => {
      expect(
        isIgnoredFromPackage('/node_modules/typescript/lib/typescript.js'),
      ).toBe(true);
    });

    it('returns true for /node_modules/vite/dist/node/index.js', () => {
      expect(
        isIgnoredFromPackage('/node_modules/vite/dist/node/index.js'),
      ).toBe(true);
    });

    it('returns true for /forge.config.ts', () => {
      expect(isIgnoredFromPackage('/forge.config.ts')).toBe(true);
    });

    it('returns true for /tsconfig.json', () => {
      expect(isIgnoredFromPackage('/tsconfig.json')).toBe(true);
    });

    it('returns true for /dprint.json', () => {
      expect(isIgnoredFromPackage('/dprint.json')).toBe(true);
    });
  });

  describe('.bin exclusion', () => {
    it('returns true for /node_modules/.bin/electron', () => {
      expect(isIgnoredFromPackage('/node_modules/.bin/electron')).toBe(true);
    });

    it('returns true for /node_modules/better-sqlite3/.bin/something', () => {
      expect(
        isIgnoredFromPackage('/node_modules/better-sqlite3/.bin/something'),
      ).toBe(true);
    });

    it('returns true for /node_modules/electron-squirrel-startup/.bin/foo', () => {
      expect(
        isIgnoredFromPackage(
          '/node_modules/electron-squirrel-startup/.bin/foo',
        ),
      ).toBe(true);
    });
  });
});
