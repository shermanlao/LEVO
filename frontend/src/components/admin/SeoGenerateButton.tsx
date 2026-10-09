'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

export type SeoGenerateKind = 'series' | 'product_type' | 'project' | 'site';

type SeoGenerateButtonProps = {
  kind: SeoGenerateKind;
  helpKey: string;
  name: string;
  description?: string;
  notes?: string;
  existingTitle?: string;
  existingDescription?: string;
  onGenerated: (result: { title: string; description: string }) => void;
  className?: string;
};

export default function SeoGenerateButton({
  kind,
  helpKey,
  name,
  description,
  notes,
  existingTitle,
  existingDescription,
  onGenerated,
  className = '',
}: SeoGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const trimmedName = name.trim();
    if (kind !== 'site' && !trimmedName) {
      setError(kind === 'project' ? 'Enter a title first.' : 'Enter a name first.');
      return;
    }
    if (kind === 'site' && !trimmedName && !description?.trim() && !notes?.trim()) {
      setError('Add a company name or homepage text first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name: trimmedName,
          description: description?.trim() || undefined,
          notes: notes?.trim() || undefined,
          existingTitle: existingTitle?.trim() || undefined,
          existingDescription: existingDescription?.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Generation failed');
      const title = String((data as { title?: string }).title || '').trim();
      const nextDescription = String((data as { description?: string }).description || '').trim();
      if (!title || !nextDescription) throw new Error('The model returned empty SEO text');
      onGenerated({ title, description: nextDescription });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button helpKey={helpKey} variant="secondary" onClick={() => void generate()} disabled={loading}>
        {loading ? 'Generating…' : 'Generate SEO'}
      </Button>
      {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
