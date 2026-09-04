'use client';

import { ReactNode } from 'react';

type Props = {
  title: string;
  slotLabel?: string;
  previewUrl: string | null;
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
  onClose: () => void;
  onReset?: () => void;
  extraHeader?: ReactNode;
};

export default function AiImageWorkbenchDialog({
  title,
  slotLabel,
  previewUrl,
  loading,
  error,
  children,
  onClose,
  onReset,
  extraHeader,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 gap-3">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {slotLabel ? <p className="text-sm text-gray-500">Slot: {slotLabel}</p> : null}
          </div>
          <div className="flex gap-2 items-center">
            {extraHeader}
            {onReset ? (
              <button type="button" className="px-3 py-1 rounded border text-sm" onClick={onReset}>
                Reset
              </button>
            ) : null}
            <button type="button" className="text-gray-500 hover:text-gray-800" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-100 rounded min-h-[280px] flex items-center justify-center overflow-hidden">
            {loading ? (
              <p className="text-gray-500 text-sm">Working… this can take a minute.</p>
            ) : previewUrl ? (
              <img src={previewUrl} alt="AI preview" className="object-contain max-h-[420px]" />
            ) : (
              <p className="text-gray-500 text-sm">No preview yet</p>
            )}
          </div>
          <div>{children}</div>
        </div>
        {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
      </div>
    </div>
  );
}
