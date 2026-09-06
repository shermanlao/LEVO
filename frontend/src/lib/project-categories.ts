export const PROJECT_CATEGORY_ORDER = [
  'Culture',
  'Office',
  'Residential',
  'Retail',
  'Hospitality',
] as const;

export function projectFilterCategories(
  projects: Array<{ attributes?: { category?: string } }>
): string[] {
  const present = new Set<string>();
  for (const project of projects) {
    const category = String(project.attributes?.category || '').trim();
    if (category && category !== 'All') present.add(category);
  }
  const ordered = PROJECT_CATEGORY_ORDER.filter((category) => present.has(category));
  const extras = [...present]
    .filter((category) => !PROJECT_CATEGORY_ORDER.includes(category as (typeof PROJECT_CATEGORY_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...ordered, ...extras];
}
