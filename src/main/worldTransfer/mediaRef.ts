/**
 * @role World-transfer media reference helper
 * @owns Extracting the bare file name from a `vv-media://<host>/<file>` URL and
 *   building the in-zip path for a media file.
 * @seam Pure functions shared by exportWorld/importWorld; no DB/Electron imports.
 * @calls shared/media/imageSource for canonical URL normalization.
 */
import { type MediaImageHost, normalizeMediaImageSrcForHost } from '../../shared/media/imageSource';

/** Folder inside the zip that holds copied `*-images` files, per host. */
export function mediaZipPath(host: MediaImageHost, fileName: string): string {
  return `media/${host}/${fileName}`;
}

/** Folder inside the zip that holds copied `.map.gz` world-map snapshots. */
export function snapshotZipPath(storageKey: string): string {
  return `world-maps/${storageKey}`;
}

/**
 * Returns the bare file name referenced by a media column for `host`, or null
 * when the value is empty or does not point at that host's media.
 */
export function parseMediaFileName(src: unknown, host: MediaImageHost): string | null {
  const normalized = normalizeMediaImageSrcForHost(typeof src === 'string' ? src : null, host);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    const fileName = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    return fileName && !fileName.includes('/') ? fileName : null;
  } catch {
    return null;
  }
}
