import Cropper, { type CropperImage, type CropperSelection } from 'cropperjs';
import { useEffect, useRef, useState } from 'react';
import type { StoredImageCrop } from '../../../shared/contracts/imageCropTypes';
import {
  aspectRatioToPresetId,
  buildCropOutputSize,
  computeImageTransformScale,
  IMAGE_CROP_ASPECT_PRESETS,
  type ImageCropApplyResult,
  type ImageCropAspectPresetId,
  parseStoredImageCrop,
  presetIdToAspectRatio,
  resolveCropOutputMimeType,
} from '../../lib/imageCrop';
import ModalShell from '../ui/ModalShell';

const CROPPER_TEMPLATE = `
  <cropper-canvas background style="height: 420px;">
    <cropper-image rotatable scalable translatable></cropper-image>
    <cropper-shade hidden></cropper-shade>
    <cropper-handle action="select" plain></cropper-handle>
    <cropper-selection initial-coverage="0.75" movable resizable zoomable keyboard outlined>
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
      <cropper-handle action="n-resize"></cropper-handle>
      <cropper-handle action="e-resize"></cropper-handle>
      <cropper-handle action="s-resize"></cropper-handle>
      <cropper-handle action="w-resize"></cropper-handle>
      <cropper-handle action="ne-resize"></cropper-handle>
      <cropper-handle action="nw-resize"></cropper-handle>
      <cropper-handle action="se-resize"></cropper-handle>
      <cropper-handle action="sw-resize"></cropper-handle>
    </cropper-selection>
  </cropper-canvas>
`;

type ImageCropModalProps = {
  isOpen: boolean;
  title: string;
  sourceImageSrc: string;
  sourceFileName: string;
  sourceMimeType: string;
  initialCropJson?: string | null;
  onCancel: () => void;
  onApply: (result: ImageCropApplyResult) => Promise<void> | void;
};

function applyAspectPreset(
  selection: CropperSelection,
  presetId: ImageCropAspectPresetId,
): void {
  const aspectRatio = presetIdToAspectRatio(presetId) ?? 0;
  selection.aspectRatio = aspectRatio;
  selection.initialAspectRatio = aspectRatio;
  selection.$reset();
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to export cropped image.'));
        return;
      }
      resolve(blob);
    }, mimeType);
  });
}

function toStoredImageCrop(params: {
  selection: CropperSelection;
  cropperImage: CropperImage;
  sourceNaturalWidth: number;
  sourceNaturalHeight: number;
  outputMimeType: string;
  presetId: ImageCropAspectPresetId;
}): StoredImageCrop {
  const transformMatrix = params.cropperImage.$getTransform().slice(0, 6) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  return {
    version: 1,
    aspect_ratio: presetIdToAspectRatio(params.presetId),
    selection: {
      x: params.selection.x,
      y: params.selection.y,
      width: params.selection.width,
      height: params.selection.height,
    },
    transform: {
      matrix: transformMatrix,
    },
    source: {
      natural_width: params.sourceNaturalWidth,
      natural_height: params.sourceNaturalHeight,
    },
    output: {
      mime_type: params.outputMimeType,
    },
  };
}

export default function ImageCropModal({
  isOpen,
  title,
  sourceImageSrc,
  sourceFileName,
  sourceMimeType,
  initialCropJson,
  onCancel,
  onApply,
}: ImageCropModalProps) {
  const headingId = 'image-crop-modal-title';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [activePresetId, setActivePresetId] = useState<ImageCropAspectPresetId>('card');
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !imageRef.current || !containerRef.current) {
      return;
    }

    const initialCrop = parseStoredImageCrop(initialCropJson);
    const nextPresetId = aspectRatioToPresetId(initialCrop?.aspect_ratio ?? 2);
    setActivePresetId(nextPresetId);
    setApplyError(null);

    const cropper = new Cropper(imageRef.current, {
      container: containerRef.current,
      template: CROPPER_TEMPLATE,
    });
    cropperRef.current = cropper;

    const restoreState = () => {
      const cropperImage = cropper.getCropperImage();
      const selection = cropper.getCropperSelection();
      if (!cropperImage || !selection) {
        return;
      }

      if (initialCrop) {
        selection.aspectRatio = initialCrop.aspect_ratio ?? 0;
        selection.initialAspectRatio = initialCrop.aspect_ratio ?? 0;
        cropperImage.$setTransform(initialCrop.transform.matrix);
        selection.$change(
          initialCrop.selection.x,
          initialCrop.selection.y,
          initialCrop.selection.width,
          initialCrop.selection.height,
          initialCrop.aspect_ratio ?? 0,
          true,
        );
        selection.$render();
        return;
      }

      applyAspectPreset(selection, nextPresetId);
    };

    const restoreTimer = window.setTimeout(restoreState, 0);

    return () => {
      window.clearTimeout(restoreTimer);
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [initialCropJson, isOpen, sourceImageSrc]);

  const handleAspectPresetChange = (presetId: ImageCropAspectPresetId) => {
    setActivePresetId(presetId);
    const selection = cropperRef.current?.getCropperSelection();
    if (!selection) {
      return;
    }
    applyAspectPreset(selection, presetId);
  };

  const handleApply = async () => {
    const cropper = cropperRef.current;
    const cropperImage = cropper?.getCropperImage();
    const selection = cropper?.getCropperSelection();
    const sourceImage = imageRef.current;
    if (!cropper || !cropperImage || !selection || !sourceImage) {
      setApplyError('Unable to export cropped image.');
      return;
    }

    setIsApplying(true);
    setApplyError(null);

    try {
      const outputMimeType = resolveCropOutputMimeType(sourceMimeType);
      const displayScale = computeImageTransformScale(cropperImage.$getTransform());
      const outputSize = buildCropOutputSize(
        selection.width / displayScale,
        selection.height / displayScale,
      );
      const canvas = await selection.$toCanvas(outputSize);
      const croppedBlob = await canvasToBlob(canvas, outputMimeType);
      await onApply({
        croppedBlob,
        crop: toStoredImageCrop({
          selection,
          cropperImage,
          sourceNaturalWidth: sourceImage.naturalWidth,
          sourceNaturalHeight: sourceImage.naturalHeight,
          outputMimeType,
          presetId: activePresetId,
        }),
      });
    } catch (error) {
      setApplyError(
        error instanceof Error ? error.message : 'Unable to export cropped image.',
      );
    } finally {
      setIsApplying(false);
    }
  };

  const runSelectionAction = (
    action: (selection: CropperSelection, cropperImage: CropperImage) => void,
  ) => {
    const cropper = cropperRef.current;
    const selection = cropper?.getCropperSelection();
    const cropperImage = cropper?.getCropperImage();
    if (!selection || !cropperImage) {
      return;
    }
    action(selection, cropperImage);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={isApplying ? () => undefined : onCancel}
      labelledBy={headingId}
      boxClassName='max-w-6xl'
      closeOnBackdrop={!isApplying}
    >
      <div className='space-y-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h2 id={headingId} className='text-lg font-semibold text-slate-900'>
              {title}
            </h2>
            <p className='mt-1 text-sm text-slate-600'>
              Adjust framing, then apply crop. Source: {sourceFileName}
            </p>
          </div>
        </div>

        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            {IMAGE_CROP_ASPECT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type='button'
                className={[
                  'btn btn-sm',
                  activePresetId === preset.id ? 'btn-primary' : 'btn-outline',
                ].join(' ')}
                onClick={() => handleAspectPresetChange(preset.id)}
                disabled={isApplying}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() => runSelectionAction((selection) => selection.$zoom(0.1))}
              disabled={isApplying}
            >
              Zoom in
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() => runSelectionAction((selection) => selection.$zoom(-0.1))}
              disabled={isApplying}
            >
              Zoom out
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() =>
                runSelectionAction((_selection, cropperImage) => cropperImage.$rotate(-90))}
              disabled={isApplying}
            >
              Rotate left
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() =>
                runSelectionAction((_selection, cropperImage) => cropperImage.$rotate(90))}
              disabled={isApplying}
            >
              Rotate right
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() =>
                runSelectionAction((_selection, cropperImage) => cropperImage.$scale(-1, 1))}
              disabled={isApplying}
            >
              Flip horizontal
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() =>
                runSelectionAction((_selection, cropperImage) => cropperImage.$scale(1, -1))}
              disabled={isApplying}
            >
              Flip vertical
            </button>
            <button
              type='button'
              className='btn btn-sm btn-outline'
              onClick={() =>
                runSelectionAction((selection, cropperImage) => {
                  cropperImage.$setTransform([1, 0, 0, 1, 0, 0]);
                  applyAspectPreset(selection, activePresetId);
                })}
              disabled={isApplying}
            >
              Reset
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className='overflow-hidden rounded-xl border border-slate-200 bg-slate-950/5 p-3'
        >
          <img ref={imageRef} src={sourceImageSrc} alt='Crop source' className='hidden' />
        </div>

        {applyError
          ? <p className='text-sm text-rose-600'>{applyError}</p>
          : null}

        <div className='flex justify-end gap-2'>
          <button
            type='button'
            className='btn btn-ghost'
            onClick={onCancel}
            disabled={isApplying}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn-primary'
            onClick={() => void handleApply()}
            disabled={isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
