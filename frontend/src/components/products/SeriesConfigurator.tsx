'use client';

import { ReactNode, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/types/product';
import ProductList from './ProductList';
import ImageCarousel from './ImageCarousel';
import type { SeriesComboPreview } from './ProductSkuDialog';
import Button from '@/components/ui/Button';
import { HelpLink } from '@/components/admin/HelpButton';
import CatalogFunnelToggle from './CatalogFunnelToggle';
import PageRoute from '@/components/layout/PageRoute';
import type { RouteCrumb } from '@/components/layout/pageRouteItems';
import { FileDownloadIcon } from './ProductFileIcons';
import SeriesFamilyTitle from './SeriesFamilyTitle';
import { datasheetGalleryUrls, productImageUrl, toPublicImagePath } from '@/lib/image-utils';
import { productFinishValue } from '@shared/product-specs';
import {
  getSeriesDatasheetUrl,
  getSeriesLdtUrl,
  getSeriesPolarUrl,
} from '@/lib/sqlite-api';
import {
  ALWAYS_VISIBLE_KINDS,
  SIZE_KIND,
  cartesianComboRows,
  comboMatchesSelection,
  composeDatasheetSku,
  filledSelection,
  findSizePack,
  groupOptionsByKind,
  optionText,
  realOptionsForKind,
  selectionFromSearchParams,
  specFromCombo,
  variantKindLabel,
  visibleSelectorKinds,
  wattageOptionValue,
  type SeriesOptionDto,
  type VariantCatalogOption,
} from '@shared/series-options';
import { fillPhraseTemplate } from '@shared/description-phrase';
import { findAppearancePhoto, type AppearancePhotoDto } from '@shared/appearance-photos';
import { copyPackDatasheetFields, mergeScopedDatasheetLabels, type DatasheetLabel } from '@shared/datasheet-labels';

type SeriesConfiguratorProps = {
  seriesName: string;
  seriesSlug: string;
  seriesDescription?: string;
  seriesPhrase?: string;
  seriesProductCode?: string | null;
  gallery?: ReactNode;
  breadcrumbItems?: RouteCrumb[];
  options: SeriesOptionDto[];
  typeLabels?: DatasheetLabel[];
  seriesLabels?: DatasheetLabel[];
  products: Product[];
  appearancePhotos?: AppearancePhotoDto[];
  currentSeriesSlug?: string;
  seriesImageUrl?: string;
  seriesThumbUrl?: string;
  children?: ReactNode;
};

const FILE_BTN = 'btn-primary inline-flex items-center text-sm py-2 px-3 whitespace-nowrap';
const FILE_ICON = 'mr-1 h-4 w-4';

function helpKeyForKind(kind: string): string {
  if (kind === 'beam_angle') return 'catalog.series.beam';
  if (kind === 'dimming') return 'catalog.series.dimming';
  if ((ALWAYS_VISIBLE_KINDS as readonly string[]).includes(kind)) return `catalog.series.${kind}`;
  return `catalog.series.${kind}`;
}

function optionLabel(kind: string, value: string): string {
  if (kind === 'wattage') return /w$/i.test(value) ? value : `${value}W`;
  if (kind === 'beam_angle') return /°|deg/i.test(value) ? value : `${value}°`;
  return value;
}

function catalogFromOptions(options: SeriesOptionDto[]): VariantCatalogOption[] {
  return options
    .filter((option) => option.kind && option.value)
    .map((option) => ({
      kind: option.kind,
      value: option.value,
      code: option.code || '',
      sort_order: option.sort_order,
      label_image: option.label_image || null,
    }));
}

function productPlain(product: Product): Record<string, unknown> {
  const attrs = (product.attributes || {}) as Record<string, unknown>;
  return { ...attrs, id: product.id };
}

export default function SeriesConfigurator({
  seriesName,
  seriesSlug,
  seriesDescription,
  seriesPhrase,
  seriesProductCode,
  gallery,
  breadcrumbItems = [],
  options,
  typeLabels = [],
  seriesLabels = [],
  products,
  appearancePhotos = [],
  currentSeriesSlug,
  seriesImageUrl = '',
  seriesThumbUrl = '',
  children,
}: SeriesConfiguratorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const grouped = useMemo(() => groupOptionsByKind(options), [options]);
  const selectors = useMemo(() => visibleSelectorKinds(grouped), [grouped]);
  const selection = useMemo(() => selectionFromSearchParams(searchParams), [searchParams]);
  const catalog = useMemo(() => catalogFromOptions(options), [options]);
  const packs = useMemo(() => products.map(productPlain), [products]);

  const comboRows = useMemo(() => {
    const combos = cartesianComboRows(grouped);
    return combos
      .filter((combo) => comboMatchesSelection(combo.selection, selection))
      .map((combo): SeriesComboPreview => {
        const specs = specFromCombo(grouped, combo.selection);
        specs.product_code = seriesProductCode || '';
        specs.name = seriesName;
        const sizeValue = optionText(specs.size) || combo.selection[SIZE_KIND];
        const pack = findSizePack(packs, sizeValue, grouped);
        copyPackDatasheetFields(specs, pack);
        const packProduct = pack
          ? products.find((product) => Number(product.id) === Number(pack.id))
          : null;
        const appearance = findAppearancePhoto(appearancePhotos, { ...specs, ...combo.selection });
        const uniquePhotos = datasheetGalleryUrls({
          main: toPublicImagePath(appearance?.main_image_A) || productImageUrl(packProduct || undefined),
          size: packProduct?.attributes?.size_image,
          fallbackMain: seriesThumbUrl || seriesImageUrl,
          polarUrl: getSeriesPolarUrl(seriesSlug, combo.selection),
        });
        const wattage = wattageOptionValue(specs.wattage) || combo.selection.wattage || '';
        return {
          id: combo.id,
          selection: combo.selection,
          name: seriesName,
          sku: composeDatasheetSku(specs, catalog, grouped),
          productCode: optionText(seriesProductCode),
          wattage,
          size: optionText(specs.size) || optionText(specs.dimensions) || combo.selection[SIZE_KIND] || '',
          cct: optionText(specs.cct) || combo.selection.cct || '',
          beam: optionText(specs.beam_angle) || combo.selection.beam_angle || '',
          dimming: optionText(specs.dimming) || combo.selection.dimming || '',
          finish: productFinishValue(specs),
          imageUrl: uniquePhotos[0] || seriesThumbUrl || seriesImageUrl,
          photos: uniquePhotos,
          specs,
          seriesName,
          description: fillPhraseTemplate(seriesPhrase, specs) || undefined,
          labels: mergeScopedDatasheetLabels({
            spec: specs,
            catalog,
            typeLabels,
            seriesLabels,
          }),
        };
      });
  }, [appearancePhotos, catalog, grouped, packs, products, selection, seriesImageUrl, seriesName, seriesPhrase, seriesProductCode, seriesSlug, seriesThumbUrl, typeLabels, seriesLabels]);

  const liveGallery = useMemo(() => {
    const filled = filledSelection(grouped, selection);
    const specs = specFromCombo(grouped, filled);
    const appearance = findAppearancePhoto(appearancePhotos, { ...specs, ...filled });
    const sizeValue = optionText(specs.size) || filled[SIZE_KIND];
    const pack = findSizePack(packs, sizeValue, grouped);
    const packProduct = pack
      ? products.find((product) => Number(product.id) === Number(pack.id))
      : null;
    const appearanceUrl = toPublicImagePath(appearance?.main_image_A);
    const packUrl = productImageUrl(packProduct || undefined);
    const visitorPicked = Object.values(selection).some(Boolean);
    const hero =
      (visitorPicked && appearanceUrl) || seriesImageUrl || appearanceUrl || packUrl;
    if (!hero) return null;
    const extra = toPublicImagePath(packProduct?.attributes?.main_image_B);
    const urls = extra && extra !== hero ? [hero, extra] : [hero];
    return (
      <ImageCarousel
        key={hero}
        product={{
          attributes: {
            name: seriesName,
            images: {
              data: urls.map((url, index) => ({
                id: index,
                attributes: { url },
              })),
            },
          },
        }}
      />
    );
  }, [appearancePhotos, grouped, packs, products, selection, seriesImageUrl, seriesName]);

  const complete = selectors.length > 0 && selectors.every((field) => Boolean(selection[field.key]));

  function setKind(kind: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(kind, value);
    else params.delete(kind);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  function clearSelection() {
    router.push(pathname, { scroll: false });
  }

  const hasSelection = Object.values(selection).some(Boolean);
  const showFunnel = selectors.length > 0;

  function renderConfigFields() {
    if (selectors.length === 0) return null;
    return (
      <>
        <div className={`flex items-baseline justify-between gap-3 mb-2 ${hasSelection ? '' : 'max-lg:hidden'}`}>
          <h2 className="hidden lg:block text-sm font-semibold text-gray-900">Configure</h2>
          {hasSelection ? (
            <Button
              helpKey="catalog.series.clear"
              variant="ghost"
              onClick={clearSelection}
              className="text-sm md:ml-auto"
            >
              Clear
            </Button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {selectors.map((field) => {
            const list = realOptionsForKind(field.key, grouped[field.key] || []);
            return (
              <label key={field.key} className="block min-w-0">
                <span className="block text-xs font-medium text-gray-600 mb-1">
                  {variantKindLabel(field.key)}
                </span>
                <select
                  className="select-field !py-1.5 text-sm"
                  data-help-key={helpKeyForKind(field.key)}
                  value={selection[field.key] || ''}
                  onChange={(e) => setKind(field.key, e.target.value)}
                >
                  <option value="">All</option>
                  {list.map((option) => (
                    <option key={option.value} value={option.value}>
                      {optionLabel(field.key, option.value)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
        {complete ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <HelpLink
              href={getSeriesDatasheetUrl(seriesSlug, selection)}
              helpKey="catalog.datasheet.download"
              target="_blank"
              rel="noopener noreferrer"
              className={FILE_BTN}
            >
              <FileDownloadIcon className={FILE_ICON} />
              Datasheet
            </HelpLink>
            <HelpLink
              href={getSeriesLdtUrl(seriesSlug, selection)}
              helpKey="catalog.ldt.download"
              download
              className={FILE_BTN}
            >
              <FileDownloadIcon className={FILE_ICON} />
              LDT
            </HelpLink>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div>
      {breadcrumbItems.length > 0 ? (
        <PageRoute
          items={breadcrumbItems}
          end={
            showFunnel ? (
              <CatalogFunnelToggle
                helpKey="catalog.series.filter_toggle"
                open={mobileOpen}
                onToggle={() => setMobileOpen((open) => !open)}
                hasActive={hasSelection}
                controlsId="series-config-panel"
                label="Configure products"
              />
            ) : null
          }
        />
      ) : null}

      {selectors.length > 0 ? (
        <div
          id="series-config-panel"
          className={`${mobileOpen ? 'block' : 'hidden'} lg:hidden bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6`}
        >
          {renderConfigFields()}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        {liveGallery || gallery ? <div className="w-full md:w-1/2 min-w-0">{liveGallery || gallery}</div> : null}
        <div className={liveGallery || gallery ? 'w-full md:w-1/2 min-w-0' : 'w-full'}>
          <SeriesFamilyTitle seriesName={seriesName} seriesSlug={seriesSlug} />
          {seriesDescription ? (
            <div className="prose max-w-none mb-4 text-sm">
              <p>{seriesDescription}</p>
            </div>
          ) : null}
          {selectors.length > 0 ? <div className="max-lg:hidden">{renderConfigFields()}</div> : null}
        </div>
      </div>

      {children}

      {comboRows.length === 0 && cartesianComboRows(grouped).length > 0 ? (
        <p className="text-gray-600">No options match this selection.</p>
      ) : (
        <ProductList
          rows={comboRows}
          seriesSlug={currentSeriesSlug || seriesSlug}
          seriesImageUrl={seriesThumbUrl || seriesImageUrl}
        />
      )}
    </div>
  );
}
