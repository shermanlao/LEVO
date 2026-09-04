import { listFailoverCredentials, getParsingHints, type ResolvedImageAiCredentials } from './resolveCredentials';
import { recordAiTokenUsage } from './aiUsage';
import { PHRASE_PLACEHOLDER_FIELDS } from '../shared/description-phrase';

export type PhraseFieldHint = {
  key: string;
  label: string;
  values?: string[];
};

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
  const gemini = rec.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  return gemini || '';
}

function parseUsage(parsed: unknown): {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
} {
  const usage = (parsed as {
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  })?.usage;
  return {
    promptTokens: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
    completionTokens: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null,
    totalTokens: typeof usage?.total_tokens === 'number' ? usage.total_tokens : null,
  };
}

function cleanPhrase(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:\w+)?\s*/i, '').replace(/\s*```$/i, '').trim();
  text = text.replace(/^["“]|["”]$/g, '').trim();
  return text.replace(/\s+/g, ' ').trim();
}

function buildMessages(opts: {
  guide: string;
  seriesName: string;
  typeName?: string;
  fields: PhraseFieldHint[];
  existing?: string;
  hints?: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  const allowed = PHRASE_PLACEHOLDER_FIELDS.map((field) => `{{${field.key}}}`).join(', ');
  const fieldLines = opts.fields
    .filter((field) => field.key)
    .map((field) => {
      const values = (field.values || []).filter(Boolean);
      const vary = values.length >= 2;
      return `- ${field.label} ({{${field.key}}}): ${values.join(', ') || 'no values yet'}${vary ? ' — varies by variant, must stay a placeholder' : ''}`;
    })
    .join('\n');
  const system = [
    'You write lighting-catalog product description phrases for datasheets.',
    'Output one semicolon-separated technical sentence in the style of manufacturer datasheets (Wever & Ducré style).',
    'Do not use markdown, titles, or quotation marks around the whole phrase.',
    'Use {{key}} placeholders (exactly those keys) for specification values that come from the selected variant.',
    `Allowed placeholders: ${allowed}`,
    'Keep guide-word facts (application, material, extras, replaceability) as literal text.',
    'Do not invent numeric spec values; put those in placeholders.',
    'Return only the phrase.',
  ].join(' ');

  const user = [
    `Series: ${opts.seriesName}`,
    opts.typeName ? `Product type: ${opts.typeName}` : '',
    opts.hints ? `Organization notes: ${opts.hints}` : '',
    fieldLines ? `Series option fields:\n${fieldLines}` : '',
    opts.existing?.trim() ? `Current phrase (revise if useful):\n${opts.existing.trim()}` : '',
    `Guide words:\n${opts.guide.trim()}`,
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
      max_tokens: 800,
    }),
  });
  const text = await res.text().catch(() => '');
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }
  const usage = parseUsage(parsed);
  await recordAiTokenUsage(
    { feature: 'description_phrase_generate', provider: creds.provider, modelId: creds.modelId },
    {
      success: res.ok,
      httpStatus: res.status,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    }
  );
  if (!res.ok) {
    const err = parsed as { error?: { message?: string } | string; message?: string };
    const nested = typeof err.error === 'string' ? err.error : err.error?.message;
    throw new Error(nested || err.message || `Phrase generate failed (${res.status})`);
  }
  const phrase = cleanPhrase(extractChatText(parsed));
  if (!phrase) throw new Error('The model returned an empty phrase');
  return phrase;
}

export async function generateDescriptionPhrase(opts: {
  guide: string;
  seriesName: string;
  typeName?: string;
  fields?: PhraseFieldHint[];
  existing?: string;
}): Promise<{ phrase: string }> {
  const guide = String(opts.guide || '').trim();
  if (!guide) throw new Error('Guide words are required');
  const seriesName = String(opts.seriesName || '').trim();
  if (!seriesName) throw new Error('Series name is required');

  const hints = await getParsingHints();
  const messages = buildMessages({
    guide,
    seriesName,
    typeName: opts.typeName,
    fields: Array.isArray(opts.fields) ? opts.fields : [],
    existing: opts.existing,
    hints,
  });

  const credsList = await listFailoverCredentials('description_phrase_generate');
  if (!credsList.length) throw new Error('AI is not configured');

  let lastError: Error | null = null;
  for (const creds of credsList) {
    try {
      const phrase = await completeWithProvider(creds, messages);
      return { phrase };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('AI is not configured');
}
