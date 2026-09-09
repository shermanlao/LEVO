'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  IMAGE_INTAKE_ACCEPT,
  IMAGE_INTAKE_HINT,
  imageFileFromDataTransfer,
  imageFileFromList,
} from '@/lib/image-file-intake';

type FileHandler = (file: File) => void;

let activeToken: symbol | null = null;
let activeHandler: FileHandler | null = null;
let pasteBound = false;

function bindPasteListener() {
  if (pasteBound || typeof document === 'undefined') return;
  pasteBound = true;
  document.addEventListener('paste', (event) => {
    if (!activeHandler) return;
    const file = imageFileFromDataTransfer(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    activeHandler(file);
  });
}

export function useImageFileIntake({
  enabled = true,
  onFile,
}: {
  enabled?: boolean;
  onFile: FileHandler;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef(Symbol('image-intake'));
  const onFileRef = useRef(onFile);
  const [dragging, setDragging] = useState(false);
  onFileRef.current = onFile;

  const takeFile = useCallback(
    (file: File | null) => {
      if (!enabled || !file) return;
      onFileRef.current(file);
    },
    [enabled]
  );

  const clearActive = useCallback(() => {
    if (activeToken === tokenRef.current) {
      activeToken = null;
      activeHandler = null;
    }
    setDragging(false);
  }, []);

  const activate = useCallback(() => {
    if (!enabled) return;
    bindPasteListener();
    activeToken = tokenRef.current;
    activeHandler = (file) => onFileRef.current(file);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) clearActive();
  }, [clearActive, enabled]);

  useEffect(() => () => clearActive(), [clearActive]);

  const openFilePicker = useCallback(() => {
    if (!enabled) return;
    inputRef.current?.click();
  }, [enabled]);

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      event.preventDefault();
      event.stopPropagation();
      activate();
      setDragging(true);
    },
    [activate, enabled]
  );

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      setDragging(true);
    },
    [enabled]
  );

  const onDragLeave = useCallback((event: DragEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragging(false);
      takeFile(imageFileFromDataTransfer(event.dataTransfer));
    },
    [takeFile]
  );

  return {
    inputRef,
    dragging,
    takeFile,
    activate,
    deactivate: clearActive,
    openFilePicker,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}

type ImageFileIntakeProps = {
  enabled?: boolean;
  onFile: FileHandler;
  helpKey?: string;
  className?: string;
  children: ReactNode;
  /** Empty placeholders open the file picker on click. Filled previews keep their own click (lightbox). */
  clickToPick?: boolean;
  accept?: string;
};

/** Drop, paste, or choose a file on an image placeholder. */
export default function ImageFileIntake({
  enabled = true,
  onFile,
  helpKey,
  className = '',
  children,
  clickToPick = true,
  accept = IMAGE_INTAKE_ACCEPT,
}: ImageFileIntakeProps) {
  const {
    inputRef,
    dragging,
    takeFile,
    activate,
    deactivate,
    openFilePicker,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  } = useImageFileIntake({ enabled, onFile });

  return (
    <div
      className={`relative outline-none ${enabled && clickToPick ? 'cursor-pointer' : ''} ${className}`.trim()}
      data-help-key={helpKey}
      title={IMAGE_INTAKE_HINT}
      tabIndex={enabled ? 0 : undefined}
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      onFocus={activate}
      onBlur={deactivate}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(event) => {
        if (!enabled || !clickToPick) return;
        if ((event.target as HTMLElement).closest('button, a, input, label')) return;
        event.preventDefault();
        event.stopPropagation();
        openFilePicker();
      }}
      onKeyDown={(event) => {
        if (!enabled || !clickToPick) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        openFilePicker();
      }}
    >
      {children}
      {dragging ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-white text-sm font-medium pointer-events-none">
          Drop photo
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        tabIndex={-1}
        disabled={!enabled}
        onChange={(event) => {
          const file = imageFileFromList(event.target.files);
          event.target.value = '';
          takeFile(file);
        }}
      />
    </div>
  );
}
