import { listFailoverCredentials, getParsingHints, type ResolvedImageAiCredentials } from './resolveCredentials';
import { parseUsageFromXaiResponse, recordAiTokenUsage } from './aiUsage';
import { clampSeoText } from './seoAi';

export const CATALOG_DESCRIPTION_KINDS = ['product_type'] as const;
export type CatalogDescriptionKind = (typeof CATALOG_DESCRIPTION_KINDS)[number];

const DESCRIPTION_MAX = 320;

export function isCatalogDescriptionKind(value: string): value is CatalogDescriptionKind {
  return (CATALOG_DESCRIPTION_KINDS as readonly string[]).includes(value);
}

export function parseCatalogDescription(raw: string): string {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The model did not return description JSON');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('The model did not return description JSON');
  }
  const description = clampSeoText(String((parsed as { description?: unknown }).description || ''), DESCRIPTION_MAX);
  if (!description) throw new Error('The model returned an empty description');
  return description;
}

function extractChatText(parsed: unknown): string {
  const rec = parsed as {
    choices?: Array<{ message?: { content?: unknown } }>;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = rec.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part === 'string' ? part : String((part as { text?: string })?.text || '')))
      .join('')
      .trim();
    if (joined) return joined;
  }
  return rec.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function buildMessages(opts: {
  kind: CatalogDescriptionKind;
  name: string;
  existing: string;
  hints: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  const system = [
    'You write the public category description for an architectural LED lighting catalog.',
    'The text appears under the category name on the products page.',
    'Return only a JSON object with key "description". No markdown.',
    'One or two plain sentences. No HTML. Stay within 280 characters.',
    'Use only the category name and any existing copy. Do not invent specifications, certifications, or product counts.',
    'When existing copy is supplied, improve the wording and keep accurate facts.',
  ].join(' ');
  const user = [
    `Page: ${opts.kind.replace('_', ' ')}`,
    `Name: ${opts.name}`,
    opts.existing ? `Current description:\n${opts.existing}` : '',
    opts.hints ? `Organization notes: ${opts.hints}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function completeWithProvider(
  creds: ResolvedImageAiCredentials,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const base = creds.baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
      'x-goog-api-key': creds.apiKey,
    },
    body: JSON.stringify({
      model: creds.modelId,
      messages,
      temperature: 0.4,
      max_tokens: 400,
    }),
  });
  const text = await res.text().catch(() => '');
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }
  const usage = parseUsageFromXaiResponse(parsed);
  await recordAiTokenUsage(
    { feature: 'catalog_description_generate', provider: creds.provider, modelId: creds.modelId },
    {
      success: res.ok,
      httpStatus: res.status,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: usage.costUsd,
    }
  );
  if (!res.ok) {
    const err = parsed as { error?: { message?: string } | string; message?: string };
    const nested = typeof err.error === 'string' ? err.error : err.error?.message;
    throw new Error(nested || err.message || `Description generate failed (${res.status})`);
  }
  return parseCatalogDescription(extractChatText(parsed));
}

export async function generateCatalogDescription(opts: {
  kind: string;
  name?: string;
  existing?: string;
}): Promise<{ description: string }> {
  const kind = String(opts.kind || '').trim();
  if (!isCatalogDescriptionKind(kind)) throw new Error('Description kind is required');
  const name = clampSeoText(opts.name || '', 200);
  if (!name) throw new Error('A name is required');
  const existing = clampSeoText(opts.existing || '', 2000);
  const hints = await getParsingHints();
  const messages = buildMessages({
    kind,
    name,
    existing,
    hints: clampSeoText(hints || '', 1000),
  });

  const credsList = await listFailoverCredentials('catalog_description_generate');
  if (!credsList.length) throw new Error('AI is not configured');

  let lastError: Error | null = null;
  for (const creds of credsList) {
    try {
      return { description: await completeWithProvider(creds, messages) };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('AI is not configured');
}
