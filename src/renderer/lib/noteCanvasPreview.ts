export function resolveCanvasPreferredImage(params: {
  imageSrc?: string | null;
  canvasEnabled: boolean;
  canvasPreviewImage?: string | null;
}): string | null {
  const canvasPreviewImage = params.canvasPreviewImage?.trim() ?? '';
  if (params.canvasEnabled && canvasPreviewImage.length > 0) {
    return canvasPreviewImage;
  }

  const imageSrc = params.imageSrc?.trim() ?? '';
  return imageSrc.length > 0 ? imageSrc : null;
}
