'use client';

import { useEffect, useId, useRef, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import OptionTag from '@/components/ui/OptionTag';

export type VariantPickerTag = {
  value: string;
  code: string;
  selected: boolean;
};

function tagLabel(option: { value: string; code?: string }): string {
  return option.code ? `${option.value} · ${option.code}` : option.value;
}

function MenuRow({
  selected,
  helpKey,
  onClick,
  children,
}: {
  selected: boolean;
  helpKey: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <HelpButton
      helpKey={helpKey}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100"
    >
      <span
        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-black ${
          selected ? 'bg-black text-white' : 'bg-white'
        }`}
        aria-hidden
      >
        {selected ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6.2 4.6 9 10 3" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </HelpButton>
  );
}

export default function VariantOptionPicker({
  label,
  tags,
  includeNa,
  naSelected,
  onToggle,
  onToggleNa,
}: {
  label: string;
  tags: VariantPickerTag[];
  includeNa: boolean;
  naSelected: boolean;
  onToggle: (tag: { value: string; code: string }) => void;
  onToggleNa: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!includeNa && tags.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No options yet.{' '}
        <Button
          helpKey="admin.dash.link.variant_options"
          variant="ghost"
          href="/admin/variant-options"
          className="text-blue-600 hover:underline"
        >
          Add them on Variant
        </Button>
      </p>
    );
  }

  const selected = tags.filter((tag) => tag.selected);

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-30' : ''}`}>
      <HelpButton
        helpKey="admin.product_series.option_menu"
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className="select-field flex items-center justify-between gap-2 text-left text-sm"
      >
        <span className="text-gray-600">Select options</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-gray-500" fill="currentColor" aria-hidden>
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </HelpButton>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg"
        >
          {includeNa ? (
            <MenuRow
              selected={naSelected}
              helpKey="admin.product_series.appearance_na"
              onClick={onToggleNa}
            >
              N/A
            </MenuRow>
          ) : null}
          {tags.map((tag) => (
            <MenuRow
              key={tag.value}
              selected={tag.selected}
              helpKey={tag.selected ? 'admin.product_series.option_remove' : 'admin.product_series.option_pick'}
              onClick={() => onToggle(tag)}
            >
              {tagLabel(tag)}
            </MenuRow>
          ))}
        </div>
      ) : null}
      {naSelected || selected.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {naSelected ? (
            <OptionTag helpKey="admin.product_series.appearance_na" selected onClick={onToggleNa}>
              N/A
            </OptionTag>
          ) : null}
          {selected.map((tag) => (
            <OptionTag
              key={tag.value}
              helpKey="admin.product_series.option_remove"
              selected
              onClick={() => onToggle(tag)}
            >
              {tagLabel(tag)}
            </OptionTag>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400">None selected</p>
      )}
      {includeNa && tags.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No catalog values yet.{' '}
          <Button
            helpKey="admin.dash.link.variant_options"
            variant="ghost"
            href="/admin/variant-options"
            className="text-blue-600 hover:underline"
          >
            Add them on Variant
          </Button>
          {` or set N/A if this series has no ${label.toLowerCase()}.`}
        </p>
      ) : null}
    </div>
  );
}
