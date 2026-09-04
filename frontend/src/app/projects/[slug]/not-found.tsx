import NotFoundView, { DEFAULT_NOT_FOUND_LINKS } from '@/components/layout/NotFoundView';

export default function ProjectNotFound() {
  return (
    <NotFoundView
      title="Project not found"
      description="This project is not in the LEVO gallery. Browse other projects or the product catalog."
      links={[
        { href: '/projects', label: 'Browse projects', helpKey: 'catalog.404.projects', variant: 'primary' },
        { href: '/products', label: 'Browse products', helpKey: 'catalog.404.products', variant: 'secondary' },
        { href: '/', label: 'Home', helpKey: 'catalog.404.home', variant: 'secondary' },
        { href: '/contact', label: 'Contact us', helpKey: 'catalog.404.contact', variant: 'secondary' },
      ]}
    />
  );
}
