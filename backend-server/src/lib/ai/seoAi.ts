import { listFailoverCredentials, getParsingHints, type ResolvedImageAiCredentials } from './resolveCredentials';
import { parseUsageFromXaiResponse, recordAiTokenUsage } from './aiUsage';

export const SEO_KINDS = ['series', 'product_type', 'project', 'site'] as const;
export type SeoKind = (typeof SEO_KINDS)[number];

const TITLE_MAX: Record<SeoKind, number> = {
  series: 60,
  product_type: 60,
  project: 60,
  site: 70,
};
const DESCRIPTION_MAX = 160;

export function isSeoKind(value: string): value is SeoKind {
  return (SEO_KINDS as readonly string[]).includes(value);
}

export function clampSeoText(value: string, max: number): string {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
  if (!max || text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > Math.floor(max * 0.6) ? sliced.slice(0, lastSpace) : sliced).trim();
}

export function parseSeoModelText(raw: string, kind: SeoKind): { title: string; description: string } {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The model did not return SEO JSON');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('The model did not return SEO JSON');
  }
  const rec = parsed as { title?: unknown; description?: unknown };
  const title = clampSeoText(String(rec.title || ''), TITLE_MAX[kind]);
  const description = clampSeoText(String(rec.description || ''), DESCRIPTION_MAX);
  if (!title || !description) throw new Error('The model returned empty SEO text');
  return { title, description };
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
  kind: SeoKind;
  name: string;
  description: string;
  notes: string;
  existingTitle: string;
  existingDescription: string;
  hints: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  const pageTitle =
    opts.kind === 'site'
      ? 'The title is the full browser title for the homepage and the site default. Include the company name. Keep it within 70 characters.'
      : 'The public site appends " | {company}" to this title. Do not add a brand suffix. Keep it within 60 characters.';
  const system = [
    'You write search titles and meta descriptions for an architectural LED lighting catalog.',
    'Return only a JSON object with keys "title" and "description". No markdown.',
    pageTitle,
    'The description is one plain sentence of 140 to 160 characters. No HTML.',
    'Use only facts from the source. Do not invent specifications, project details, or certifications.',
    'When an existing title or description is supplied, improve the wording and keep accurate facts.',
  ].join(' ');
  const user = [
    `Page: ${opts.kind.replace('_', ' ')}`,
    opts.name ? `Name: ${opts.name}` : '',
    opts.description ? `Public copy:\n${opts.description}` : '',
    opts.notes ? `Extra notes:\n${opts.notes}` : '',
    opts.hints ? `Organization notes: ${opts.hints}` : '',
    opts.existingTitle ? `Current title: ${opts.existingTitle}` : '',
    opts.existingDescription ? `Current description: ${opts.existingDescription}` : '',
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
  messages: Array<{ role: string; content: string }>,
  kind: SeoKind
): Promise<{ title: string; description: string }> {
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
    { feature: 'seo_generate', provider: creds.provider, modelId: creds.modelId },
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
    throw new Error(nested || err.message || `SEO generate failed (${res.status})`);
  }
  return parseSeoModelText(extractChatText(parsed), kind);
}

export async function generateSeo(opts: {
  kind: string;
  name?: string;
  description?: string;
  notes?: string;
  existingTitle?: string;
  existingDescription?: string;
}): Promise<{ title: string; description: string }> {
  const kind = String(opts.kind || '').trim();
  if (!isSeoKind(kind)) throw new Error('SEO kind is required');
  const name = clampSeoText(opts.name || '', 200);
  const description = clampSeoText(opts.description || '', 4000);
  const notes = clampSeoText(opts.notes || '', 2000);
  if (kind !== 'site' && !name) throw new Error('A name is required');
  if (kind === 'site' && !name && !description && !notes) throw new Error('Site copy is required');

  const hints = await getParsingHints();
  const messages = buildMessages({
    kind,
    name,
    description,
    notes,
    existingTitle: clampSeoText(opts.existingTitle || '', TITLE_MAX[kind]),
    existingDescription: clampSeoText(opts.existingDescription || '', DESCRIPTION_MAX),
    hints: clampSeoText(hints || '', 1000),
  });

  const credsList = await listFailoverCredentials('seo_generate');
  if (!credsList.length) throw new Error('AI is not configured');

  let lastError: Error | null = null;
  for (const creds of credsList) {
    try {
      return await completeWithProvider(creds, messages, kind);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('AI is not configured');
}
