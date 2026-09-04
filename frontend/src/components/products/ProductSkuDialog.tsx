'use client';

import { useEffect, useId, useMemo } from 'react';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';
import ImageCarousel from './ImageCarousel';
import DatasheetSpecBadges from './DatasheetSpecBadges';
import { FileDownloadIcon, InstallationIcon } from './ProductFileIcons';
import { collectPhysicalRows, collectTechnicalRows } from '@/lib/product-specs';
import {
  getSeriesDatasheetUrl,
  getSeriesInstallationUrl,
  getSeriesLdtUrl,
} from '@/lib/sqlite-api';
import type { DatasheetLabel } from '@shared/datasheet-labels';

export type SeriesComboPreview = {
  id: string;
  selection: Record<string, string>;
  name: string;
  sku: string;
  productCode: string;
  wattage?: string;
  size?: string;
  cct?: string;
  beam?: string;
  dimming?: string;
  finish?: string;
  imageUrl: string;
  photos: string[];
  specs: Record<string, unknown>;
  seriesName?: string;
  description?: string;
  labels?: DatasheetLabel[];
};

type ProductSkuDialogProps = {
  row: SeriesComboPreview;
  seriesSlug: string;
  open: boolean;
  onClose: () => void;
};

function SkuFileButtons({
  seriesSlug,
  selection,
  className,
  buttonClass,
}: {
  seriesSlug: string;
  selection: Record<string, string>;
  className: string;
  buttonClass: string;
}) {
  const fileIcon = 'mr-1 h-4 w-4';
  return (
    <div className={className}>
      <HelpLink
        href={getSeriesDatasheetUrl(seriesSlug, selection)}
        helpKey="catalog.datasheet.download"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <FileDownloadIcon className={fileIcon} />
        Datasheet
      </HelpLink>
      <HelpLink
        href={getSeriesInstallationUrl(seriesSlug)}
        helpKey="catalog.installation.download"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <InstallationIcon className={fileIcon} />
        Installation
      </HelpLink>
      <HelpLink
        href={getSeriesLdtUrl(seriesSlug, selection)}
        helpKey="catalog.ldt.download"
        download
        className={buttonClass}
      >
        <FileDownloadIcon className={fileIcon} />
        LDT
      </HelpLink>
    </div>
  );
}

export default function ProductSkuDialog({ row, seriesSlug, open, onClose }: ProductSkuDialogProps) {
  const titleId = useId();
  const specRows = useMemo(
    () => [...collectTechnicalRows(row.specs), ...collectPhysicalRows(row.specs)],
    [row.specs]
  );
  const galleryProduct = useMemo(
    () => ({
      attributes: {
        name: row.name,
        images: {
          data: row.photos.map((url, index) => ({
            id: index,
            attributes: { url },
          })),
        },
      },
    }),
    [row.name, row.photos]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const fileBtn =
    'btn-primary inline-flex items-center justify-center text-sm py-2 px-3 h-9 box-border whitespace-nowrap';
  const fileBtnBar = `${fileBtn} w-full px-2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[92vh] lg:h-auto max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-2xl font-bold text-gray-900">
              {row.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SkuFileButtons
              seriesSlug={seriesSlug}
              selection={row.selection}
              className="hidden lg:flex flex-wrap items-center gap-2"
              buttonClass={fileBtn}
            />
            <HelpButton
              helpKey="catalog.series.sku_close"
              className="p-2 text-gray-500 hover:text-gray-900"
              aria-label="Close"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </HelpButton>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(16rem,1fr)] gap-6 items-start">
            <div className="min-w-0 w-full max-w-md mx-auto lg:mx-0">
              <ImageCarousel product={galleryProduct} compact />
              <DatasheetSpecBadges specs={row.specs} labels={row.labels} />
              {row.description ? (
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{row.description}</p>
              ) : null}
            </div>
            <div className="min-w-0">
              {row.seriesName || row.sku ? (
                <dl className="text-sm mb-4">
                  {row.seriesName ? (
                    <div className="mb-2">
                      <dt className="text-gray-500">Series</dt>
                      <dd className="font-medium">{row.seriesName}</dd>
                    </div>
                  ) : null}
                  {row.sku ? (
                    <div className="mb-2">
                      <dt className="text-gray-500">SKU</dt>
                      <dd className="font-medium break-words">{row.sku}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <div className="table-wrap overflow-hidden">
                {specRows.length > 0 ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {specRows.map((spec, index) => (
                        <tr key={spec.label} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <th scope="row" className="text-left font-normal text-gray-600 px-3 py-2 w-1/2">
                            {spec.label}
                          </th>
                          <td className="px-3 py-2 font-medium text-gray-900">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500 p-3">No specifications listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <SkuFileButtons
          seriesSlug={seriesSlug}
          selection={row.selection}
          className="lg:hidden grid grid-cols-3 gap-2 shrink-0 border-t border-gray-200 px-4 py-3 bg-white"
          buttonClass={fileBtnBar}
        />
      </div>
    </div>
  );
}
