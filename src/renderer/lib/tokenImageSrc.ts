const TOKEN_IMAGE_MEDIA_PREFIX = 'vv-media://token-images/';

export function normalizeTokenImageSrc(
  imageSrc: string | null | undefined,
): string | null {
  if (typeof imageSrc !== 'string') {
    return null;
  }

  const trimmed = imageSrc.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(TOKEN_IMAGE_MEDIA_PREFIX)) {
    return trimmed;
  }

  if (!trimmed.startsWith('file://')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const match = decodedPath.match(/\/token-images\/([^/]+)$/i);
    if (!match) {
      return trimmed;
    }

    return `${TOKEN_IMAGE_MEDIA_PREFIX}${encodeURIComponent(match[1])}`;
  } catch {
    return trimmed;
  }
}
