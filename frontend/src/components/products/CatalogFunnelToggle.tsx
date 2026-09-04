'use client';

import HelpButton from '@/components/admin/HelpButton';

type CatalogFunnelToggleProps = {
  helpKey: string;
  open: boolean;
  onToggle: () => void;
  hasActive?: boolean;
  controlsId: string;
  label?: string;
};

export default function CatalogFunnelToggle({
  helpKey,
  open,
  onToggle,
  hasActive = false,
  controlsId,
  label = 'Filter products',
}: CatalogFunnelToggleProps) {
  return (
    <HelpButton
      helpKey={helpKey}
      className="series-mobile-filter relative hover:text-gray-600"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={label}
      title={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>
      {hasActive ? (
        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-black" aria-hidden="true" />
      ) : null}
    </HelpButton>
  );
}
