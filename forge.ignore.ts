/**
 * Packaging ignore filter for Electron Forge.
 * Defines which files are included in the final asar archive.
 * Imported by forge.config.ts and tested in tests/unit/forge-ignore.test.ts.
 */

export const PACKAGE_INCLUDE = [
  '/.vite',
  '/node_modules/better-sqlite3',
  '/node_modules/electron-squirrel-startup',
  '/package.json',
] as const;

/**
 * Returns true if `path` should be EXCLUDED from the asar, false if it should be INCLUDED.
 * Empty string is always included (Electron Packager passes '' for the root).
 */
export function isIgnoredFromPackage(path: string): boolean {
  if (path === '') return false;
  const included = PACKAGE_INCLUDE.some((prefix) => path.startsWith(prefix));
  if (!included) return true;
  return path.includes('/.bin/');
}
