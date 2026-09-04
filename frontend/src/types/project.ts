export type Project = {
  id: number;
  name?: string;
  title?: string;
  slug: string;
  description?: string;
  category?: string;
  location?: string;
  client?: string;
  architect?: string;
  completion_date?: string;
  featured_image?: string | null;
  thumbnail?: string | null;
  map_url?: string | null;
  attributes?: Record<string, unknown>;
};
