'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { HelpLink } from '@/components/admin/HelpButton';
import type { RouteCrumb } from './pageRouteItems';

type PageRouteProps = {
  items: RouteCrumb[];
  className?: string;
  end?: ReactNode;
};

const LINK_CLASS = 'hover:text-gray-900';

export default function PageRoute({ items, className = 'mb-8', end }: PageRouteProps) {
  if (!items.length) return null;

  return (
    <nav className={`flex items-center gap-3 ${className}`} aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center space-x-2 text-sm text-gray-600 min-w-0 flex-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <li aria-hidden="true">/</li>
              )}
              <li className={isLast ? 'font-semibold text-gray-900' : undefined}>
                {isLast || !item.href ? (
                  <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
                ) : item.helpKey ? (
                  <HelpLink href={item.href} helpKey={item.helpKey} className={LINK_CLASS}>
                    {item.label}
                  </HelpLink>
                ) : (
                  <Link href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
      {end ? <div className="shrink-0">{end}</div> : null}
    </nav>
  );
}
