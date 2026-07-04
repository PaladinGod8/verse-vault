/**
 * @role World-transfer manifest
 * @owns The `manifest.json` shape, its builder, and the import-time version gate.
 * @seam Pure functions shared by exportWorld/importWorld; no DB or Electron imports.
 * @calls Nothing at runtime.
 */

/**
 * Bundle format version. Bump the (integer) value only for a breaking change:
 * same value imports; a newer value than the running app supports is refused.
 * Additive, forward-compatible changes add tolerated extra fields, not a bump.
 */
export const FORMAT_VERSION = 1;

export interface WorldExportManifest {
  formatVersion: number;
  app: string;
  exportedAt: string;
  worldName: string;
  tableCounts: Record<string, number>;
}

/** Thrown for every import-time rejection so the IPC layer can surface a message. */
export class WorldImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorldImportError';
  }
}

export function buildManifest(input: {
  worldName: string;
  tableCounts: Record<string, number>;
  appVersion: string;
}): WorldExportManifest {
  return {
    formatVersion: FORMAT_VERSION,
    app: `Verse Vault ${input.appVersion}`,
    exportedAt: new Date().toISOString(),
    worldName: input.worldName,
    tableCounts: input.tableCounts,
  };
}

/**
 * Parses and validates a manifest read from a bundle. Returns the manifest on
 * success; throws {@link WorldImportError} with a specific message otherwise.
 */
export function validateManifest(raw: string | undefined | null): WorldExportManifest {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new WorldImportError(
      'This file is not a Verse Vault world bundle (missing manifest).',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WorldImportError('The world bundle manifest is corrupt (invalid JSON).');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new WorldImportError('The world bundle manifest is not a valid object.');
  }

  const manifest = parsed as Partial<WorldExportManifest>;
  if (typeof manifest.formatVersion !== 'number' || !Number.isFinite(manifest.formatVersion)) {
    throw new WorldImportError(
      'This file is not a Verse Vault world bundle (missing format version).',
    );
  }

  if (manifest.formatVersion > FORMAT_VERSION) {
    throw new WorldImportError(
      'This world was exported by a newer version of Verse Vault. Please update the app and try again.',
    );
  }

  return {
    formatVersion: manifest.formatVersion,
    app: typeof manifest.app === 'string' ? manifest.app : 'Verse Vault',
    exportedAt: typeof manifest.exportedAt === 'string'
      ? manifest.exportedAt
      : new Date(0).toISOString(),
    worldName: typeof manifest.worldName === 'string' ? manifest.worldName : 'Imported World',
    tableCounts: typeof manifest.tableCounts === 'object' && manifest.tableCounts !== null
      ? manifest.tableCounts as Record<string, number>
      : {},
  };
}
