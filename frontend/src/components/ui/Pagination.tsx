'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';

export function pageItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages < 1) return [];
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  if (start > 2) items.push('ellipsis');
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  helpKey: string;
  summary?: string;
};

const btnClass = 'px-3 py-1 border rounded disabled:opacity-50';
const activeClass = 'px-3 py-1 border border-black rounded bg-black text-white';

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  helpKey,
  summary,
}: PaginationProps) {
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  if (totalPages < 1) return null;

  function go(next: number) {
    const clamped = Math.min(totalPages, Math.max(1, Math.trunc(next)));
    if (!Number.isFinite(clamped) || clamped === page) return;
    onPageChange(clamped);
  }

  function handleGo(e: FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) {
      go(n);
    } else {
      setDraft(String(page));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      {summary ? <p className="text-sm text-gray-500 mr-auto">{summary}</p> : null}
      <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
        <HelpButton
          helpKey={helpKey}
          type="button"
          className={btnClass}
          disabled={disabled || page <= 1}
          onClick={() => go(1)}
        >
          First
        </HelpButton>
        <HelpButton
          helpKey={helpKey}
          type="button"
          className={btnClass}
          disabled={disabled || page <= 1}
          onClick={() => go(page - 1)}
        >
          Previous
        </HelpButton>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <HelpButton
              key={item}
              helpKey={helpKey}
              type="button"
              className={item === page ? activeClass : btnClass}
              disabled={disabled}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => go(item)}
            >
              {item}
            </HelpButton>
          )
        )}
        <HelpButton
          helpKey={helpKey}
          type="button"
          className={btnClass}
          disabled={disabled || page >= totalPages}
          onClick={() => go(page + 1)}
        >
          Next
        </HelpButton>
        <HelpButton
          helpKey={helpKey}
          type="button"
          className={btnClass}
          disabled={disabled || page >= totalPages}
          onClick={() => go(totalPages)}
        >
          Last
        </HelpButton>
        {totalPages > 1 ? (
          <form onSubmit={handleGo} className="flex items-center gap-2 ml-1">
            <label className="text-sm text-gray-600" htmlFor={`go-page-${helpKey}`}>
              Go to
            </label>
            <input
              id={`go-page-${helpKey}`}
              type="number"
              min={1}
              max={totalPages}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
              disabled={disabled}
            />
            <HelpButton helpKey={helpKey} type="submit" className={btnClass} disabled={disabled}>
              Go
            </HelpButton>
          </form>
        ) : null}
      </nav>
    </div>
  );
}
