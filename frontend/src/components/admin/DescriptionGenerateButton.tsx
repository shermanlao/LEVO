'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

type DescriptionGenerateButtonProps = {
  helpKey: string;
  name: string;
  existing?: string;
  onGenerated: (description: string) => void;
  className?: string;
};

export default function DescriptionGenerateButton({
  helpKey,
  name,
  existing,
  onGenerated,
  className = '',
}: DescriptionGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a name first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'product_type',
          name: trimmedName,
          existing: existing?.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Generation failed');
      const description = String((data as { description?: string }).description || '').trim();
      if (!description) throw new Error('The model returned an empty description');
      onGenerated(description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button helpKey={helpKey} variant="secondary" onClick={() => void generate()} disabled={loading}>
        {loading ? 'Generating…' : 'Generate description'}
      </Button>
      {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
