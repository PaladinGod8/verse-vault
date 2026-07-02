export const MEDIA_IMAGE_HOSTS = [
  'token-images',
  'world-images',
  'character-images',
  'background-images',
  'item-images',
  'faction-images',
  'lore-note-images',
] as const;

export type MediaImageHost = (typeof MEDIA_IMAGE_HOSTS)[number];

function buildMediaImageUrl(host: MediaImageHost, fileName: string): string {
  return `vv-media://${host}/${encodeURIComponent(fileName)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCanonicalMediaUrl(
  imageSrc: string,
  allowedHosts: readonly MediaImageHost[],
): string | null {
  try {
    const parsed = new URL(imageSrc);
    if (parsed.protocol !== 'vv-media:') {
      return null;
    }

    const hostName = parsed.hostname.toLowerCase() as MediaImageHost;
    if (!allowedHosts.includes(hostName)) {
      return null;
    }

    const decodedPath = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    if (!decodedPath || decodedPath.includes('/')) {
      return null;
    }

    return buildMediaImageUrl(hostName, decodedPath);
  } catch {
    return null;
  }
}

function normalizeLegacyFileUrl(
  imageSrc: string,
  allowedHosts: readonly MediaImageHost[],
): string | null {
  try {
    const parsed = new URL(imageSrc);
    if (parsed.protocol !== 'file:') {
      return null;
    }

    const decodedPath = decodeURIComponent(parsed.pathname).replace(/\\/g, '/');
    for (const host of allowedHosts) {
      const match = decodedPath.match(
        new RegExp(`/${escapeRegExp(host)}/([^/]+)$`, 'i'),
      );
      if (match) {
        return buildMediaImageUrl(host, match[1]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeMediaImageSrc(
  imageSrc: string | null | undefined,
  allowedHosts: readonly MediaImageHost[],
): string | null {
  if (typeof imageSrc !== 'string') {
    return null;
  }

  const trimmed = imageSrc.trim();
  if (!trimmed) {
    return null;
  }

  return normalizeCanonicalMediaUrl(trimmed, allowedHosts)
    ?? normalizeLegacyFileUrl(trimmed, allowedHosts);
}

export function normalizeMediaImageSrcForHost(
  imageSrc: string | null | undefined,
  host: MediaImageHost,
): string | null {
  return normalizeMediaImageSrc(imageSrc, [host]);
}

export function normalizeAnyMediaImageSrc(
  imageSrc: string | null | undefined,
): string | null {
  return normalizeMediaImageSrc(imageSrc, MEDIA_IMAGE_HOSTS);
}
