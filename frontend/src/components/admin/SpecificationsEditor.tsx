'use client';

import Button from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';

export type SpecPair = { key: string; value: string };

export function recordToSpecPairs(rec?: Record<string, string> | null): SpecPair[] {
  return Object.entries(rec || {}).map(([key, value]) => ({ key, value: String(value ?? '') }));
}

export function specPairsToRecord(pairs: SpecPair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (key) out[key] = pair.value;
  }
  return out;
}

export default function SpecificationsEditor({
  specs,
  onChange,
  helpKeyPrefix,
}: {
  specs: SpecPair[];
  onChange: (next: SpecPair[]) => void;
  helpKeyPrefix: string;
}) {
  return (
    <div className="space-y-3">
      {specs.map((row, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <TextInput
            label="Key"
            value={row.key}
            onChange={(e) => {
              const next = [...specs];
              next[index] = { ...next[index], key: e.target.value };
              onChange(next);
            }}
          />
          <div className="flex gap-2 items-end">
            <TextInput
              label="Value"
              className="flex-1"
              value={row.value}
              onChange={(e) => {
                const next = [...specs];
                next[index] = { ...next[index], value: e.target.value };
                onChange(next);
              }}
            />
            <Button
              helpKey={`${helpKeyPrefix}.spec_remove`}
              variant="danger"
              onClick={() => onChange(specs.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button
        helpKey={`${helpKeyPrefix}.spec_add`}
        variant="secondary"
        onClick={() => onChange([...specs, { key: '', value: '' }])}
      >
        Add specification
      </Button>
    </div>
  );
}
