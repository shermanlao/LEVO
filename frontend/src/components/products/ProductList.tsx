'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RobustImage from '@/components/ui/robust-image';
import EmptyState from '@/components/ui/EmptyState';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';
import { FileDownloadIcon } from './ProductFileIcons';
import ProductSkuDialog, { type SeriesComboPreview } from './ProductSkuDialog';
import { BeamSpecValue, CctSpecValue, FinishSpecValue } from './SpecValueIcons';
import {
  getSeriesDatasheetUrl,
  getSeriesLdtUrl,
} from '@/lib/sqlite-api';
import {
  SIZE_KIND,
  VARIANT_KIND_DISPLAY_ORDER,
  optionText,
  variantKindLabel,
  variantSpecFields,
} from '@shared/series-options';

type ProductListProps = {
  rows: SeriesComboPreview[];
  seriesSlug: string;
  seriesImageUrl?: string;
};

type ListColumn = { key: string; label: string };

const FILE_BTN = 'btn-primary inline-flex items-center text-xs py-1 px-1.5 whitespace-nowrap';
const FILE_ICON = 'mr-1 h-3.5 w-3.5';
const TH = 'px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-middle';
const TD = 'px-2 py-2 align-middle text-sm text-gray-600';
const CORE_COLUMN_KINDS = ['wattage', SIZE_KIND, 'cct', 'beam_angle', 'dimming'] as const;
const VARIANT_COLUMN_ORDER = [...VARIANT_KIND_DISPLAY_ORDER];

function tableHeaderLabel(kind: string, fallback: string): string {
  if (kind === 'cct') return 'CCT';
  if (kind === 'beam_angle') return 'Beam';
  if (kind === 'ip_rating') return 'IP';
  return fallback;
}

function wattageLabel(value?: string): string {
  if (!value) return '';
  return /w$/i.test(value) ? value : `${value}W`;
}

function skuLabel(row: SeriesComboPreview): string {
  return row.sku || row.name || 'this combination';
}

function comboKindValue(row: SeriesComboPreview, kind: string): string {
  if (kind === 'wattage') {
    return row.wattage || optionText(row.selection?.wattage) || optionText(row.specs?.wattage);
  }
  if (kind === SIZE_KIND) {
    return optionText(row.specs?.dimensions) || row.size || optionText(row.selection?.[SIZE_KIND]) || '';
  }
  if (kind === 'cct') return row.cct || optionText(row.selection?.cct) || optionText(row.specs?.cct);
  if (kind === 'beam_angle') {
    return row.beam || optionText(row.selection?.beam_angle) || optionText(row.specs?.beam_angle);
  }
  if (kind === 'dimming') {
    return row.dimming || optionText(row.selection?.dimming) || optionText(row.specs?.dimming);
  }
  if (kind === 'colour') {
    return row.finish || optionText(row.selection?.colour) || optionText(row.specs?.colour);
  }
  return optionText(row.selection?.[kind]) || optionText(row.specs?.[kind]);
}

function toColumn(key: string): ListColumn {
  const field = variantSpecFields().find((item) => item.key === key);
  return { key, label: tableHeaderLabel(key, field?.label || variantKindLabel(key)) };
}

function rankIn(order: readonly string[], key: string): number {
  const index = order.indexOf(key);
  return index < 0 ? order.length : index;
}

function listColumns(rows: SeriesComboPreview[]): ListColumn[] {
  const present = new Set<string>();
  for (const row of rows) {
    for (const [kind, value] of Object.entries(row.selection || {})) {
      if (value) present.add(kind);
    }
    for (const kind of CORE_COLUMN_KINDS) {
      if (comboKindValue(row, kind)) present.add(kind);
    }
  }
  if (
    rows.some((row) => Boolean(row.finish)) &&
    !present.has('colour') &&
    !present.has('trim_color')
  ) {
    present.add('colour');
  }

  return [...present]
    .sort((a, b) => rankIn(VARIANT_COLUMN_ORDER, a) - rankIn(VARIANT_COLUMN_ORDER, b))
    .map(toColumn);
}

function columnWidthClass(key: string): string {
  if (key === SIZE_KIND) return 'w-[11%]';
  return '';
}

function SizeValue({ row }: { row: SeriesComboPreview }) {
  const dimensions = optionText(row.specs?.dimensions) || '';
  const cutout = optionText(row.specs?.cutout_size);
  const fallback = row.size || optionText(row.selection?.[SIZE_KIND]);
  const source = dimensions || fallback;
  if (!source) return <>—</>;

  let dim = source;
  let cut = cutout;
  const split = source.split(/\s*\/\s*cutout\s*/i);
  if (split.length === 2 && split[0] && split[1]) {
    dim = split[0];
    cut = split[1];
  }
  if (dim && cut) {
    return (
      <span className="block leading-snug">
        <span className="block break-words">{dim}</span>
        <span className="block break-words text-gray-500">cutout {cut}</span>
      </span>
    );
  }
  return <span className="block leading-snug break-words">{source}</span>;
}

function SpecValue({
  row,
  kind,
  placeholder = '—',
}: {
  row: SeriesComboPreview;
  kind: string;
  placeholder?: string | null;
}) {
  if (kind === SIZE_KIND) {
    const has = optionText(row.specs?.dimensions) || row.size || optionText(row.selection?.[SIZE_KIND]);
    if (!has) return placeholder ? <>{placeholder}</> : null;
    return <SizeValue row={row} />;
  }
  const value = comboKindValue(row, kind);
  if (!value || value === 'None') return placeholder ? <>{placeholder}</> : null;
  if (kind === 'cct') return <CctSpecValue value={value} />;
  if (kind === 'beam_angle') return <BeamSpecValue value={value} />;
  if (kind === 'colour' || kind === 'trim_color') return <FinishSpecValue value={value} />;
  if (kind === 'wattage') return <>{wattageLabel(value)}</>;
  return <span className="break-words leading-snug">{value}</span>;
}

function ComboFileButtons({ row, seriesSlug }: { row: SeriesComboPreview; seriesSlug: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <HelpLink
        href={getSeriesDatasheetUrl(seriesSlug, row.selection)}
        helpKey="catalog.datasheet.download"
        target="_blank"
        rel="noopener noreferrer"
        className={FILE_BTN}
      >
        <FileDownloadIcon className={FILE_ICON} />
        Datasheet
      </HelpLink>
      <HelpLink
        href={getSeriesLdtUrl(seriesSlug, row.selection)}
        helpKey="catalog.ldt.download"
        download
        className={FILE_BTN}
      >
        <FileDownloadIcon className={FILE_ICON} />
        LDT
      </HelpLink>
    </div>
  );
}

export default function ProductList({
  rows = [],
  seriesSlug,
  seriesImageUrl = '',
}: ProductListProps) {
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const openRow = rows.find((row) => row.id === openId) || null;
  const previewId = searchParams.get('preview') === '1' && rows.length === 1 ? rows[0].id : null;
  const columns = useMemo(() => listColumns(rows), [rows]);

  useEffect(() => {
    if (previewId) setOpenId(previewId);
  }, [previewId]);

  if (rows.length === 0) {
    return (
      <EmptyState>
        <p>No options available in this series yet.</p>
      </EmptyState>
    );
  }

  return (
    <div className="min-w-0">
      <ul className="lg:hidden table-wrap divide-y divide-gray-200 overflow-x-hidden">
        {rows.map((row) => {
          const imageUrl = row.imageUrl || seriesImageUrl;
          return (
            <li key={row.id} className="p-3">
              <div className="flex items-start gap-3 min-w-0">
                <HelpButton
                  helpKey="catalog.series.sku_preview"
                  className="relative block h-16 w-16 shrink-0 overflow-hidden rounded bg-white p-0"
                  aria-label={`View details for ${skuLabel(row)}`}
                  onClick={() => setOpenId(row.id)}
                >
                  <RobustImage
                    src={imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                    fallbackSrc={seriesImageUrl || undefined}
                  />
                </HelpButton>
                <HelpButton
                  helpKey="catalog.series.sku_preview"
                  className="block min-w-0 flex-1 text-left bg-transparent p-0 border-0 font-normal"
                  onClick={() => setOpenId(row.id)}
                >
                  <span className="block text-sm text-gray-600 break-words">{skuLabel(row)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                    {columns.map((column) => (
                      <span key={column.key} className="inline-flex min-w-0 items-center">
                        <SpecValue row={row} kind={column.key} placeholder={null} />
                      </span>
                    ))}
                  </span>
                </HelpButton>
              </div>
              <div className="mt-3">
                <ComboFileButtons row={row} seriesSlug={seriesSlug} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden lg:block table-wrap min-w-0">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className={`${TH} w-16`}>
                <span className="sr-only">Image</span>
              </th>
              <th scope="col" className={`${TH} w-[11%]`}>
                SKU
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${TH} ${columnWidthClass(column.key)}`}
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className={`${TH} w-[11%]`}>
                Files
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => {
              const imageUrl = row.imageUrl || seriesImageUrl;
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className={TD}>
                    <HelpButton
                      helpKey="catalog.series.sku_preview"
                      className="relative block h-12 w-12 overflow-hidden rounded bg-white p-0"
                      aria-label={`View details for ${skuLabel(row)}`}
                      onClick={() => setOpenId(row.id)}
                    >
                      <RobustImage
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                        fallbackSrc={seriesImageUrl || undefined}
                      />
                    </HelpButton>
                  </td>
                  <td className={`${TD} min-w-0`}>
                    <HelpButton
                      helpKey="catalog.series.sku_preview"
                      className="block min-w-0 w-full text-left bg-transparent p-0 border-0 font-normal"
                      onClick={() => setOpenId(row.id)}
                    >
                      <span className="block text-sm text-gray-600 break-words leading-snug">
                        {skuLabel(row)}
                      </span>
                    </HelpButton>
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className={`${TD} min-w-0`}>
                      <SpecValue row={row} kind={column.key} />
                    </td>
                  ))}
                  <td className={TD}>
                    <ComboFileButtons row={row} seriesSlug={seriesSlug} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openRow ? (
        <ProductSkuDialog row={openRow} seriesSlug={seriesSlug} open onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  );
}
