import { parseUsageFromXaiResponse, recordAiTokenUsage } from './aiUsage';
import { getImageAiProviderPreset } from './imageAiProviders';
import { listFailoverCredentials, type ResolvedImageAiCredentials } from './resolveCredentials';

const IMAGE_ONLY_MODEL_RE = /imagine|image-quality|dall-e|imagen|flash-image|nano-banana/i;
const MAX_PHOTO_DESCRIPTION_CHARS = 2000;

export function chatVisionModelId(creds: ResolvedImageAiCredentials): string {
  if (IMAGE_ONLY_MODEL_RE.test(creds.modelId)) {
    return getImageAiProviderPreset(creds.provider).modelId;
  }
  return creds.modelId;
}

export function buildOriginalPhotoDescribePrompt(fixtureDescription?: string | null): string {
  const phrase = fixtureDescription?.trim() || '';
  return [
    'Describe the ORIGINAL PHOTO only. This is the product that must stay in a later catalog restyle.',
    phrase
      ? `Catalog phrase (may list several options; prefer what you actually see): ${phrase}`
      : 'No catalog phrase was supplied.',
    'Write 6–12 short factual sentences covering:',
    '- fixture type and overall form',
    '- camera / viewing angle and apparent scale',
    '- visible materials, trim, reflector, optics, and colour',
    '- parts that would be hidden after install (springs, clips, upper housing, junction box, packaging, stands)',
    '- studio background or props to remove',
    'Do not invent specs that are not visible. Do not describe a different product.',
    'Plain text only. No markdown, titles, or quotation marks around the whole answer.',
  ].join('\n');
}

type ChatContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail?: string } }
    >;

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

function cleanDescription(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:\w+)?\s*/i, '').replace(/\s*```$/i, '').trim();
  text = text.replace(/^["“]|["”]$/g, '').trim();
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > MAX_PHOTO_DESCRIPTION_CHARS) {
    text = `${text.slice(0, MAX_PHOTO_DESCRIPTION_CHARS).trim()}…`;
  }
  return text;
}

async function completeVisionDescription(
  creds: ResolvedImageAiCredentials,
  imageDataUrl: string,
  fixtureDescription?: string | null
): Promise<string> {
  const modelId = chatVisionModelId(creds);
  const base = creds.baseUrl.replace(/\/$/, '');
  const messages: Array<{ role: string; content: ChatContent }> = [
    {
      role: 'system',
      content:
        'You look at lighting-fixture product photos and write a short factual description of what is actually visible.',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: buildOriginalPhotoDescribePrompt(fixtureDescription) },
        { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
      ],
    },
  ];
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
      'x-goog-api-key': creds.apiKey,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.2,
      max_tokens: 700,
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
    { feature: 'product_photo_style', provider: creds.provider, modelId },
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
    throw new Error(nested || err.message || `Original photo describe failed (${res.status})`);
  }
  const description = cleanDescription(extractChatText(parsed));
  if (!description) throw new Error('The model returned an empty original-photo description');
  return description;
}

/** Look at the original product photo before Imagine restyles it. Failures return empty so style match can still run. */
export async function describeOriginalProductPhoto(opts: {
  imageDataUrl: string;
  fixtureDescription?: string | null;
}): Promise<string> {
  const credsList = await listFailoverCredentials('description_phrase_generate');
  if (!credsList.length) return '';

  let lastError: Error | null = null;
  for (const creds of credsList) {
    try {
      return await completeVisionDescription(creds, opts.imageDataUrl, opts.fixtureDescription);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  if (lastError) {
    console.warn('[product-photo-style] original photo describe failed:', lastError.message);
  }
  return '';
}
