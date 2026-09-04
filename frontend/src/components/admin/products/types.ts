export type AdminTypeOption = { id: number; attributes: { name: string } };

export type AdminSeriesOption = {
  id: number;
  attributes: { name: string; slug?: string; product_type_id?: number | null };
};

export type NewProductDraft = {
  name: string;
  description: string;
  slug: string;
  wattage: number;
  lumen: number;
  cct: string;
  beam_angle: string;
  dimming: string;
  is_featured: boolean;
  product_type_id: number;
  series_id: number;
  specifications: Record<string, string>;
};

export const DIMMING_OPTIONS = ['None', 'DALI', 'Triac', '0-10V'] as const;
