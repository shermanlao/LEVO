import { HelpLink } from '@/components/admin/HelpButton';

export type NotFoundLink = {
  href: string;
  label: string;
  helpKey: string;
  variant?: 'primary' | 'secondary';
};

export const DEFAULT_NOT_FOUND_LINKS: NotFoundLink[] = [
  { href: '/products', label: 'Browse products', helpKey: 'catalog.404.products', variant: 'primary' },
  { href: '/', label: 'Home', helpKey: 'catalog.404.home', variant: 'secondary' },
  { href: '/projects', label: 'Projects', helpKey: 'catalog.404.projects', variant: 'secondary' },
  { href: '/contact', label: 'Contact us', helpKey: 'catalog.404.contact', variant: 'secondary' },
];

export default function NotFoundView({
  title = 'Page not found',
  description = 'This page is not on LEVO Lighting. Browse the catalog, view projects, or contact us for help.',
  links = DEFAULT_NOT_FOUND_LINKS,
}: {
  title?: string;
  description?: string;
  links?: NotFoundLink[];
}) {
  return (
    <div className="max-w-3xl py-8 md:py-16">
      <p className="text-sm font-medium text-gray-500 mb-3">404</p>
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p className="text-lg text-gray-700 mb-8">{description}</p>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        {links.map((link) => (
          <HelpLink
            key={`${link.href}-${link.label}`}
            href={link.href}
            helpKey={link.helpKey}
            className={link.variant === 'primary' ? 'btn-primary inline-flex justify-center' : 'btn-secondary inline-flex justify-center'}
          >
            {link.label}
          </HelpLink>
        ))}
      </div>
    </div>
  );
}
