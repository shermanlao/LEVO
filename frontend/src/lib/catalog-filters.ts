import { Product } from '@/types/product';
import {
  comboCount,
  compareOptionValues,
  groupOptionsByKind,
  optionText,
  parseOptionNumber,
  sizeLabel,
  valuesEqual,
  type SeriesOptionDto,
} from '@shared/series-options';

export type CatalogFilterOptions = {
  wattage: number[];
  size: string[];
  cct: string[];
  beam_angle: string[];
  dimming: string[];
};

export type CatalogSearchParams = { [key: string]: string | string[] | undefined };

export const CATALOG_FILTER_KEYS = ['wattage', 'size', 'cct', 'beam_angle', 'dimming'] as const;

export function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function productSizeLabel(attributes: Product['attributes']): string {
  return sizeLabel(attributes.dimensions, attributes.cutout_size);
}

export function collectFilterOptions(products: Product[]): CatalogFilterOptions {
  const options: CatalogFilterOptions = {
    wattage: [],
    size: [],
    cct: [],
    beam_angle: [],
    dimming: [],
  };

  for (const product of products) {
    const attributes = product?.attributes;
    if (!attributes) continue;

    if (attributes.wattage && !options.wattage.includes(attributes.wattage)) {
      options.wattage.push(attributes.wattage);
    }
    const size = productSizeLabel(attributes);
    if (size && !options.size.includes(size)) {
      options.size.push(size);
    }
    if (attributes.cct && !options.cct.includes(attributes.cct)) {
      options.cct.push(attributes.cct);
    }
    if (attributes.beam_angle && !options.beam_angle.includes(attributes.beam_angle)) {
      options.beam_angle.push(attributes.beam_angle);
    }
    if (attributes.dimming && !options.dimming.includes(attributes.dimming)) {
      options.dimming.push(attributes.dimming);
    }
  }

  options.wattage.sort((a, b) => a - b);
  options.size.sort((a, b) => compareOptionValues('size', a, b));
  options.cct.sort((a, b) => compareOptionValues('cct', a, b));
  options.beam_angle.sort((a, b) => compareOptionValues('beam_angle', a, b));
  options.dimming.sort((a, b) => compareOptionValues('dimming', a, b));
  return options;
}

export function catalogFilterValues(searchParams: CatalogSearchParams = {}) {
  return {
    wattage: firstSearchParam(searchParams.wattage),
    size: firstSearchParam(searchParams.size),
    cct: firstSearchParam(searchParams.cct),
    beam_angle: firstSearchParam(searchParams.beam_angle),
    dimming: firstSearchParam(searchParams.dimming),
  };
}

export function hasActiveCatalogFilters(searchParams: CatalogSearchParams = {}): boolean {
  const values = catalogFilterValues(searchParams);
  return CATALOG_FILTER_KEYS.some((key) => Boolean(values[key]));
}

export function productMatchesFilters(product: Product, searchParams: CatalogSearchParams = {}): boolean {
  if (!product?.attributes) return false;
  const { attributes } = product;
  const values = catalogFilterValues(searchParams);

  if (values.wattage && attributes.wattage !== Number(values.wattage)) return false;
  if (values.size) {
    const label = productSizeLabel(attributes);
    const dim = optionText(attributes.dimensions);
    if (label !== values.size && dim !== values.size) return false;
  }
  if (values.cct && attributes.cct !== values.cct) return false;
  if (values.beam_angle && attributes.beam_angle !== values.beam_angle) return false;
  if (values.dimming && attributes.dimming !== values.dimming) return false;
  return true;
}

export function collectFilterOptionsFromSeries(
  seriesList: Array<{ attributes?: { options?: SeriesOptionDto[] } }>
): CatalogFilterOptions {
  const options: CatalogFilterOptions = {
    wattage: [],
    size: [],
    cct: [],
    beam_angle: [],
    dimming: [],
  };
  for (const series of seriesList) {
    const grouped = groupOptionsByKind(Array.isArray(series.attributes?.options) ? series.attributes.options : []);
    for (const row of grouped.wattage || []) {
      const n = parseOptionNumber(row.value);
      if (n != null && !options.wattage.includes(n)) options.wattage.push(n);
    }
    for (const row of grouped.size || []) {
      if (row.value && !options.size.includes(row.value)) options.size.push(row.value);
    }
    for (const row of grouped.cct || []) {
      if (row.value && !options.cct.includes(row.value)) options.cct.push(row.value);
    }
    for (const row of grouped.beam_angle || []) {
      if (row.value && !options.beam_angle.includes(row.value)) options.beam_angle.push(row.value);
    }
    for (const row of grouped.dimming || []) {
      if (row.value && !options.dimming.includes(row.value)) options.dimming.push(row.value);
    }
  }
  options.wattage.sort((a, b) => a - b);
  options.size.sort((a, b) => compareOptionValues('size', a, b));
  options.cct.sort((a, b) => compareOptionValues('cct', a, b));
  options.beam_angle.sort((a, b) => compareOptionValues('beam_angle', a, b));
  options.dimming.sort((a, b) => compareOptionValues('dimming', a, b));
  return options;
}

export function seriesMatchesFilters(
  options: SeriesOptionDto[] | undefined,
  searchParams: CatalogSearchParams = {}
): boolean {
  const grouped = groupOptionsByKind(Array.isArray(options) ? options : []);
  const values = catalogFilterValues(searchParams);
  for (const key of CATALOG_FILTER_KEYS) {
    const selected = values[key];
    if (!selected) continue;
    const list = grouped[key] || [];
    if (!list.some((option) => valuesEqual(key, option.value, selected))) return false;
  }
  return true;
}

export function seriesOptionCount(options: SeriesOptionDto[] | undefined, fallback = 0): number {
  if (!Array.isArray(options) || options.length === 0) return fallback;
  return comboCount(groupOptionsByKind(options));
}

export function hasFilterChoices(options: CatalogFilterOptions): boolean {
  return (
    options.wattage.length > 0 ||
    options.size.length > 0 ||
    options.cct.length > 0 ||
    options.beam_angle.length > 0 ||
    options.dimming.length > 0
  );
}
