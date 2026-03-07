import { DndContext, useDroppable } from '@dnd-kit/core';
import { useId, useRef, useState } from 'react';

type TokenImageDropzoneProps = {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  error?: string | null;
  disabled?: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function TokenImageDropzone({
  selectedFile,
  onFileSelect,
  onClearFile,
  error,
  disabled = false,
}: TokenImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isNativeDragOver, setIsNativeDragOver] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: 'token-image-dropzone',
    disabled,
  });

  const isActive = !disabled && (isOver || isNativeDragOver);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;
    onFileSelect(files[0]);
  };

  return (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-slate-700'>
        Token Image Upload
      </label>

      <DndContext>
        <div
          ref={setNodeRef}
          className={[
            'rounded-lg border-2 border-dashed p-4 transition',
            isActive
              ? 'border-slate-600 bg-slate-100'
              : 'border-slate-300 bg-slate-50',
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
          ].join(' ')}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled) {
              setIsNativeDragOver(true);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            if (!disabled) {
              setIsNativeDragOver(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsNativeDragOver(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsNativeDragOver(false);
            handleFiles(event.dataTransfer.files);
          }}
          role='button'
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
        >
          <p className='text-sm text-slate-700'>
            Drag an image here, or click to choose a file.
          </p>
          <p className='mt-1 text-xs text-slate-500'>
            Accepted: PNG, JPEG, WEBP, GIF. Max 5 MB.
          </p>

          {selectedFile
            ? (
              <div className='mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700'>
                <p className='font-medium text-slate-900'>{selectedFile.name}</p>
                <p className='mt-1'>
                  {selectedFile.type || 'unknown type'} - {formatFileSize(selectedFile.size)}
                </p>
                <button
                  type='button'
                  className='mt-2 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!disabled) onClearFile();
                  }}
                  disabled={disabled}
                >
                  Remove selected file
                </button>
              </div>
            )
            : null}
        </div>
      </DndContext>

      <input
        id={inputId}
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = '';
        }}
        disabled={disabled}
      />

      {error ? <p className='text-xs text-rose-600'>{error}</p> : null}
    </div>
  );
}
