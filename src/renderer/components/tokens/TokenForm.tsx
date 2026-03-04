import { useEffect, useMemo, useState } from 'react';
import TokenImageDropzone from './TokenImageDropzone';
import FootprintPainterModal, {
  type FootprintPainterResult,
} from './FootprintPainterModal';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';

const TOKEN_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const TOKEN_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type TokenImageUploadPayload = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type TokenFormValues = {
  name: string;
  grid_type: TokenGridType;
  image_src?: string | null;
  is_visible: number;
  image_upload?: TokenImageUploadPayload;
  clear_image?: boolean;
  config?: string;
};

type TokenFormProps = {
  initialValues?: TokenFormValues;
  onSave: (data: TokenFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

function validateTokenImageFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (!TOKEN_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.';
  }
  if (file.size === 0) {
    return 'Selected file is empty.';
  }
  if (file.size > TOKEN_IMAGE_MAX_SIZE_BYTES) {
    return 'Image exceeds 5 MB limit.';
  }
  return null;
}

export default function TokenForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
}: TokenFormProps) {
  const isCreateMode = !initialValues;
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [gridType, setGridType] = useState<TokenGridType>(
    initialValues?.grid_type ?? 'square',
  );
  const [imageSrc, setImageSrc] = useState(initialImageSrc ?? '');
  const [isVisible, setIsVisible] = useState(initialValues?.is_visible ?? 1);
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [hasImageSrcChanged, setHasImageSrcChanged] = useState(false);
  const [painterModalOpen, setPainterModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [footprintResult, setFootprintResult] =
    useState<FootprintPainterResult | null>(null);

  const selectedImagePreviewUrl = useMemo(
    () =>
      selectedImageFile ? URL.createObjectURL(selectedImageFile) : undefined,
    [selectedImageFile],
  );

  const pendingImagePreviewUrl = useMemo(
    () =>
      pendingImageFile ? URL.createObjectURL(pendingImageFile) : undefined,
    [pendingImageFile],
  );

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
      if (pendingImagePreviewUrl) {
        URL.revokeObjectURL(pendingImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl, pendingImagePreviewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    let imageUpload: TokenImageUploadPayload | undefined;
    if (selectedImageFile) {
      const validationError = validateTokenImageFile(selectedImageFile);
      if (validationError) {
        setImageUploadError(validationError);
        return;
      }

      try {
        const buffer = await selectedImageFile.arrayBuffer();
        imageUpload = {
          fileName: selectedImageFile.name,
          mimeType: selectedImageFile.type.toLowerCase(),
          bytes: new Uint8Array(buffer),
        };
      } catch {
        setImageUploadError(
          'Unable to read the selected image file. Try a different image.',
        );
        return;
      }
    }

    setNameError(null);
    setImageUploadError(null);
    const trimmedImageSrc = imageSrc.trim();
    const normalizedImageSrc = trimmedImageSrc === '' ? null : trimmedImageSrc;
    const shouldSendImageSrc =
      isCreateMode || hasImageSrcChanged || (!clearImage && !!imageUpload);

    // Build config with footprint/framing data if available
    let config: string | undefined;
    if (footprintResult) {
      const configObj: TokenConfigShape = {
        footprint: footprintResult.footprint,
        framing: footprintResult.framing,
      };
      config = JSON.stringify(configObj);
    }

    await onSave({
      name: trimmedName,
      grid_type: gridType,
      image_src: shouldSendImageSrc ? normalizedImageSrc : undefined,
      is_visible: isVisible,
      image_upload: imageUpload,
      clear_image: clearImage,
      config,
    });
  };

  const handleFootprintPainterConfirm = (result: FootprintPainterResult) => {
    setFootprintResult(result);
    setSelectedImageFile(pendingImageFile);
    setPendingImageFile(null);
    setPainterModalOpen(false);
    setClearImage(false);
  };

  const handleFootprintPainterCancel = () => {
    setPendingImageFile(null);
    setPainterModalOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="token-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="token-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          placeholder="Token name"
          disabled={isSaving}
        />
        {nameError ? (
          <p className="mt-1 text-xs text-rose-600">{nameError}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="token-grid-type"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Grid Type <span className="text-rose-500">*</span>
        </label>
        <select
          id="token-grid-type"
          value={gridType}
          onChange={(e) => setGridType(e.target.value as TokenGridType)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          disabled={isSaving}
        >
          <option value="square">Square</option>
          <option value="hex">Hex</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="token-image-src"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Image URL
        </label>
        <input
          id="token-image-src"
          type="text"
          value={imageSrc}
          onChange={(e) => {
            setImageSrc(e.target.value);
            setHasImageSrcChanged(true);
            if (clearImage) setClearImage(false);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          placeholder="https://... or /path/to/image.png"
          disabled={isSaving}
        />
      </div>

      {!isCreateMode && initialImageSrc ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Current Image
          </label>
          {clearImage ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Image will be cleared when you save.
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <img
                src={selectedImagePreviewUrl ?? initialImageSrc}
                alt="Current token"
                className="h-20 w-20 rounded object-cover"
              />
            </div>
          )}
          <button
            type="button"
            className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              setClearImage(true);
              setImageSrc('');
              setHasImageSrcChanged(true);
              setSelectedImageFile(null);
              setFootprintResult(null);
              setImageUploadError(null);
            }}
            disabled={isSaving}
          >
            Clear image on save
          </button>
        </div>
      ) : null}

      <TokenImageDropzone
        selectedFile={selectedImageFile}
        onFileSelect={(file) => {
          const validationError = validateTokenImageFile(file);
          if (validationError) {
            setSelectedImageFile(null);
            setImageUploadError(validationError);
            return;
          }
          // Open painter modal for footprint definition
          setPendingImageFile(file);
          setPainterModalOpen(true);
          setImageUploadError(null);
        }}
        onClearFile={() => {
          setSelectedImageFile(null);
          setFootprintResult(null);
          setImageUploadError(null);
        }}
        error={imageUploadError}
        disabled={isSaving}
      />

      <div className="flex items-center gap-2">
        <input
          id="token-is-visible"
          type="checkbox"
          checked={isVisible === 1}
          onChange={(e) => setIsVisible(e.target.checked ? 1 : 0)}
          className="h-4 w-4 rounded border-slate-300"
          disabled={isSaving}
        />
        <label
          htmlFor="token-is-visible"
          className="text-sm font-medium text-slate-700"
        >
          Visible
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          <span>{initialValues ? 'Save' : 'Create'}</span>
        </button>
      </div>

      {painterModalOpen && pendingImageFile && pendingImagePreviewUrl ? (
        <FootprintPainterModal
          isOpen={painterModalOpen}
          onClose={handleFootprintPainterCancel}
          onConfirm={handleFootprintPainterConfirm}
          imageSrc={pendingImagePreviewUrl}
          gridType={gridType}
        />
      ) : null}
    </form>
  );
}
