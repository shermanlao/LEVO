import Link from 'next/link';
import React from 'react';

interface ProjectIdLinkProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Component that creates a link to a project using its ID
 * This ensures we use the correct route structure throughout the application
 */
export default function ProjectIdLink({ id, children, className = '' }: ProjectIdLinkProps) {
  return (
    <Link href={`/projects/by-id/${id}`} className={className}>
      {children}
    </Link>
  );
} 