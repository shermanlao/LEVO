export { slugify } from './shared/slugify';
import { slugify } from './shared/slugify';

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  let n = 2;
  while (await exists(`${root}-${n}`)) {
    n += 1;
  }
  return `${root}-${n}`;
}
