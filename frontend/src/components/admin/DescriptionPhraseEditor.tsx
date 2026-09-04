'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import HelpButton from '@/components/admin/HelpButton';
import OptionTag from '@/components/ui/OptionTag';
import { TextInput, FormField } from '@/components/ui/FormField';
import {
  PHRASE_PLACEHOLDER_FIELDS,
  phrasePlaceholderToken,
} from '@shared/description-phrase';

export type PhraseFieldHint = {
  key: string;
  label: string;
  values: string[];
};

type DescriptionPhraseEditorProps = {
  value: string;
  onChange: (value: string) => void;
  seriesName: string;
  typeName?: string;
  fields: PhraseFieldHint[];
};

export default function DescriptionPhraseEditor({
  value,
  onChange,
  seriesName,
  typeName,
  fields,
}: DescriptionPhraseEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [guide, setGuide] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function insertToken(key: string) {
    const token = phrasePlaceholderToken(key);
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} ${token}` : token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  async function generate() {
    if (!guide.trim()) {
      setError('Enter guide words first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/generate-description-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guide: guide.trim(),
          seriesName,
          typeName: typeName || undefined,
          fields,
          existing: value || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Generation failed');
      const phrase = String((data as { phrase?: string }).phrase || '').trim();
      if (!phrase) throw new Error('The model returned an empty phrase');
      onChange(phrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="md:col-span-2 space-y-3">
      <FormField
        label="Phrase template"
        hint={
          <HelpButton helpKey="admin.product_series.description_phrase" type="button" className="text-xs text-gray-500">
            Used on the SKU dialog and datasheet. Insert blanks such as {'{{cct}}'} so the selected variant fills them.
          </HelpButton>
        }
      >
        <textarea
          ref={textareaRef}
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
        />
      </FormField>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Insert blank</p>
        <div className="flex flex-wrap gap-1.5">
          {PHRASE_PLACEHOLDER_FIELDS.map((field) => (
            <OptionTag
              key={field.key}
              helpKey="admin.product_series.phrase_token"
              onClick={() => insertToken(field.key)}
            >
              {`{{${field.key}}}`}
            </OptionTag>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <TextInput
          className="flex-1"
          label="Guide words"
          value={guide}
          onChange={(e) => setGuide(e.target.value)}
          placeholder="Recessed downlight, die-cast aluminium, COB, replaceable driver"
        />
        <Button helpKey="admin.product_series.phrase_ai" onClick={() => void generate()} disabled={loading}>
          {loading ? 'Generating…' : 'Generate by AI'}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
