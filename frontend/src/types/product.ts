export interface Media {
  id: number;
  attributes: {
    url: string;
    formats: {
      thumbnail: { url: string };
      small: { url: string };
      medium: { url: string };
      large: { url: string };
    };
  };
}

export interface ProductType {
  id: number;
  attributes: {
    name: string;
    description: string;
    slug: string;
    featured_image: {
      data: Media | null;
    };
    series: {
      data: ProductSeries[];
    };
    datasheet_labels?: unknown;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface ProductSeries {
  id: number;
  attributes: {
    name: string;
    description: string;
    description_phrase?: string;
    slug: string;
    featured_image: {
      data: Media | null;
    };
    featured_image_source?: unknown;
    featured_image_page?: unknown;
    featured_image_datasheet?: unknown;
    specifications: Record<string, any>;
    product_type: {
      data: ProductType;
    };
    products: {
      data: Product[];
    };
    options?: import('@shared/series-options').SeriesOptionDto[];
    appearance_photos?: import('@shared/appearance-photos').AppearancePhotoDto[];
    ldt_family?: string | null;
    product_code?: string | null;
    is_featured?: boolean;
    option_count?: number;
    datasheet_labels?: unknown;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface Product {
  id: number;
  attributes: {
    name: string;
    description: string;
    slug: string;
    specifications: Record<string, any>;
    featured_image: {
      data: Media;
    };
    images: {
      data: Media[];
    };
    wattage: number;
    cct: string;
    beam_angle: string;
    dimming: 'None' | '0-10V' | 'DALI' | 'Phase Cut' | 'DMX';
    is_featured: boolean;
    series_id?: number | null;
    product_type_id?: number | null;
    product_code?: string | null;
    lumen?: number | string | null;
    system_lumen?: number | string | null;
    dimensions?: string;
    cutout_size?: string;
    mounting_type?: string;
    trim_color?: string;
    reflector_finish?: string;
    orientation?: string;
    colour?: string;
    material?: string;
    cri?: string;
    ip_rating?: string;
    lifetime?: string;
    driver_type?: string;
    power_factor?: string;
    input_voltage?: string;
    lamp_source?: string;
    warranty?: string;
    efficacy?: string;
    optic?: string;
    operating_temperature?: string;
    main_image_A?: string | null;
    main_image_B?: string | null;
    size_image?: string | null;
    application_image?: string | null;
    photometric_image?: string | null;
    ldt_family?: string | null;
    ldt_beam_degrees?: number | null;
    path?: {
      type_slug?: string;
      series_slug?: string;
    };
    datasheet: {
      data: Media | null;
    };
    series: {
      data: ProductSeries;
    };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
} 