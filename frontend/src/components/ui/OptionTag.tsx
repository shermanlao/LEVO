'use client';

import { ReactNode } from 'react';
import HelpButton from '@/components/admin/HelpButton';

export default function OptionTag({
  helpKey,
  selected = false,
  onClick,
  children,
}: {
  helpKey: string;
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <HelpButton
      helpKey={helpKey}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={selected ? 'option-tag option-tag-on' : 'option-tag'}
    >
      {children}
    </HelpButton>
  );
}
