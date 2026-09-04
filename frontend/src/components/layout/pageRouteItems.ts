export type RouteCrumb = {
  label: string;
  href?: string;
  helpKey?: string;
};

export function productRouteItems(opts?: {
  type?: { slug: string; name: string };
  series?: { slug: string; name: string };
  product?: { name: string };
}): RouteCrumb[] {
  const type = opts?.type;
  const series = opts?.series;
  const product = opts?.product;
  const hasDeeper = Boolean(type || series || product);
  const items: RouteCrumb[] = [
    {
      label: 'Products',
      href: hasDeeper ? '/products' : undefined,
      helpKey: hasDeeper ? 'catalog.breadcrumb.products' : undefined,
    },
  ];

  if (type) {
    const hasDeeperThanType = Boolean(series || product);
    items.push({
      label: type.name,
      href: hasDeeperThanType ? `/products/${type.slug}` : undefined,
      helpKey: hasDeeperThanType ? 'catalog.breadcrumb.category' : undefined,
    });
  }

  if (type && series) {
    const hasProduct = Boolean(product);
    items.push({
      label: series.name,
      href: hasProduct ? `/products/${type.slug}/${series.slug}` : undefined,
      helpKey: hasProduct ? 'catalog.breadcrumb.series' : undefined,
    });
  }

  if (product) {
    items.push({ label: product.name });
  }

  return items;
}

export function projectRouteItems(opts?: { name?: string }): RouteCrumb[] {
  const items: RouteCrumb[] = [
    {
      label: 'Projects',
      href: opts?.name ? '/projects' : undefined,
      helpKey: opts?.name ? 'catalog.breadcrumb.projects' : undefined,
    },
  ];

  if (opts?.name) {
    items.push({ label: opts.name });
  }

  return items;
}

export function resourceRouteItems(label: string): RouteCrumb[] {
  return [
    {
      label: 'Home',
      href: '/',
      helpKey: 'catalog.breadcrumb.home',
    },
    { label },
  ];
}
