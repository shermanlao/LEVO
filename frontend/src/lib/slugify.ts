export { slugify } from '@shared/slugify';
import { slugify } from '@shared/slugify';

export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  const root = slugify(baseSlug);
  if (!existingSlugs.includes(root)) return root;
  let counter = 1;
  let next = `${root}-${counter}`;
  while (existingSlugs.includes(next)) {
    counter += 1;
    next = `${root}-${counter}`;
  }
  return next;
}
