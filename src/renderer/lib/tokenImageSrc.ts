import { normalizeAnyMediaImageSrc } from '../../shared/media/imageSource';

export function normalizeTokenImageSrc(
  imageSrc: string | null | undefined,
): string | null {
  return normalizeAnyMediaImageSrc(imageSrc);
}
