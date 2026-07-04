export interface StoredImageCropSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StoredImageCropMatrix = [number, number, number, number, number, number];

export interface StoredImageCrop {
  version: 1;
  aspect_ratio: number | null;
  selection: StoredImageCropSelection;
  transform: {
    matrix: StoredImageCropMatrix;
  };
  source: {
    natural_width: number;
    natural_height: number;
  };
  output: {
    mime_type: string;
  };
}
