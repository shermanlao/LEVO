import type { ResolvedImageAiCredentials } from './resolveCredentials';
import { listFailoverCredentials } from './resolveCredentials';
import {
  parseCostUsdFromXaiImageResponse,
  parseUsageFromGoogleGenerateContent,
  recordAiTokenUsage,
  type AiUsageContext,
} from './aiUsage';
import { normalizeImageAiProviderId } from './imageAiProviders';

export type GeneratedImageResult = {
  dataUrl: string;
  mimeType: string;
  provider: string;
  modelId: string;
};

const XAI_IMAGE_MODEL = 'grok-imagine-image-quality';
const GOOGLE_IMAGE_MODEL = 'gemini-3.1-flash-image';

function dataUrlToParts(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Expected a base64 data URL for the image');
  }
  return { mimeType: match[1], base64: match[2] };
}

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function googleNativeBaseUrl(creds: ResolvedImageAiCredentials): string {
  if (creds.baseUrl.includes('generativelanguage.googleapis.com')) {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }
  return creds.baseUrl.replace(/\/$/, '');
}

function isConnectionFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const statusMatch = message.match(/\((\d+)\)/);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  if (status === 403 || status === 429 || status === 502 || status === 503) return true;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|blocked|unavailable/i.test(message);
}

async function generateWithXai(
  creds: ResolvedImageAiCredentials,
  prompt: string,
  sourceImageDataUrl: string | null,
  extraImageDataUrls: string[],
  usageCtx: AiUsageContext
): Promise<GeneratedImageResult> {
  const modelId = XAI_IMAGE_MODEL;
  const images = [
    ...extraImageDataUrls.map((url) => ({ url, type: 'image_url' as const })),
    ...(sourceImageDataUrl ? [{ url: sourceImageDataUrl, type: 'image_url' as const }] : []),
  ];
  const endpoint = images.length
    ? `${creds.baseUrl.replace(/\/$/, '')}/images/edits`
    : `${creds.baseUrl.replace(/\/$/, '')}/images/generations`;

  const body: Record<string, unknown> = {
    model: modelId,
    prompt,
    n: 1,
    response_format: 'b64_json',
  };
  if (images.length === 1) {
    body.image = images[0];
  } else if (images.length > 1) {
    body.image = images;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const errText = !res.ok ? await res.text().catch(() => '') : '';
  let parsed: unknown = null;
  if (res.ok) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  }

  const billedCost = parsed ? parseCostUsdFromXaiImageResponse(parsed) : null;
  await recordAiTokenUsage(
    { ...usageCtx, provider: 'xai', modelId },
    { success: res.ok, httpStatus: res.status, costUsd: billedCost }
  );

  if (!res.ok) {
    throw new Error(`xAI Imagine failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = parsed as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = data?.data?.[0];
  if (item?.b64_json) {
    return { dataUrl: `data:image/png;base64,${item.b64_json}`, mimeType: 'image/png', provider: 'xai', modelId };
  }
  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error('Failed to download generated image from xAI');
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get('content-type') || 'image/png';
    return { dataUrl: bufferToDataUrl(buf, mime), mimeType: mime, provider: 'xai', modelId };
  }
  throw new Error('xAI Imagine returned no image data');
}

async function generateWithGoogle(
  creds: ResolvedImageAiCredentials,
  prompt: string,
  sourceImageDataUrl: string | null,
  extraImageDataUrls: string[],
  usageCtx: AiUsageContext
): Promise<GeneratedImageResult> {
  const modelId = GOOGLE_IMAGE_MODEL;
  const url = `${googleNativeBaseUrl(creds)}/models/${modelId}:generateContent`;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  extraImageDataUrls.forEach((dataUrl, index) => {
    const { mimeType, base64 } = dataUrlToParts(dataUrl);
    parts.push({
      text:
        index === 0
          ? 'Image: STYLE REFERENCE (copy 2D line style only).'
          : `Image: extra reference ${index + 1}.`,
    });
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  });
  if (sourceImageDataUrl) {
    const { mimeType, base64 } = dataUrlToParts(sourceImageDataUrl);
    parts.push({
      text: extraImageDataUrls.length
        ? 'Image: PRODUCT PHOTO (outline identity only; flatten to 2D).'
        : 'Image: product photograph.',
    });
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
      'x-goog-api-key': creds.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  const errText = !res.ok ? await res.text().catch(() => '') : '';
  let parsed: unknown = null;
  if (res.ok) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  }
  const usage = parsed ? parseUsageFromGoogleGenerateContent(parsed) : null;
  await recordAiTokenUsage(
    { ...usageCtx, provider: 'google', modelId },
    {
      success: res.ok,
      httpStatus: res.status,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
    }
  );

  if (!res.ok) {
    throw new Error(`Google Nano Banana failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const candidates = (parsed as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  })?.candidates;

  for (const candidate of candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData || part.inline_data;
      if (!inline) continue;
      const mime =
        ('mimeType' in inline ? inline.mimeType : undefined) ||
        ('mime_type' in inline ? inline.mime_type : undefined) ||
        'image/png';
      const data = ('data' in inline ? inline.data : undefined) as string | undefined;
      if (data) {
        return { dataUrl: `data:${mime};base64,${data}`, mimeType: mime, provider: 'google', modelId };
      }
    }
  }
  throw new Error('Google image model returned no image data');
}

async function generateWithProvider(
  creds: ResolvedImageAiCredentials,
  prompt: string,
  sourceImageDataUrl: string | null,
  extraImageDataUrls: string[],
  usageCtx: AiUsageContext
): Promise<GeneratedImageResult> {
  const provider = normalizeImageAiProviderId(creds.provider);
  if (provider === 'google') {
    return generateWithGoogle(creds, prompt, sourceImageDataUrl, extraImageDataUrls, usageCtx);
  }
  if (provider === 'xai') {
    return generateWithXai(creds, prompt, sourceImageDataUrl, extraImageDataUrls, usageCtx);
  }
  throw new Error(
    `Image generation supports xAI Imagine or Google Gemini Image. Current provider "${provider}" is not supported.`
  );
}

export async function generateOrEditImage(opts: {
  creds: ResolvedImageAiCredentials;
  prompt: string;
  sourceImageDataUrl?: string | null;
  extraImageDataUrls?: string[];
  usageCtx: AiUsageContext;
}): Promise<GeneratedImageResult> {
  const source = opts.sourceImageDataUrl ?? null;
  const extra = (opts.extraImageDataUrls || []).filter((url) => url.startsWith('data:'));
  const tried = new Set<string>();
  const queue: ResolvedImageAiCredentials[] = [opts.creds];
  let lastError: unknown = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const pid = normalizeImageAiProviderId(current.provider);
    if (tried.has(pid)) continue;
    if (pid !== 'xai' && pid !== 'google') {
      tried.add(pid);
      continue;
    }
    tried.add(pid);
    try {
      return await generateWithProvider(current, opts.prompt, source, extra, opts.usageCtx);
    } catch (err) {
      lastError = err;
      if (!isConnectionFailure(err)) throw err;
      if (queue.length === 0) {
        const candidates = await listFailoverCredentials(opts.usageCtx.feature);
        for (const c of candidates) {
          const cid = normalizeImageAiProviderId(c.provider);
          if ((cid === 'xai' || cid === 'google') && !tried.has(cid)) queue.push(c);
        }
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Image generation failed: all image providers exhausted');
}

function providerErrorMessage(status: number, text: string): string {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as { error?: { message?: string } | string; message?: string };
    const nested = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message;
    const message = nested || parsed.message;
    if (message) return `Connection test failed (${status}): ${message}`;
  } catch {
    // use raw text
  }
  return `Connection test failed (${status}): ${trimmed.slice(0, 300) || 'no response body'}`;
}

export async function testAiConnection(creds: ResolvedImageAiCredentials): Promise<{ ok: boolean; message: string }> {
  const base = creds.baseUrl.replace(/\/$/, '');
  const headers = {
    Authorization: `Bearer ${creds.apiKey}`,
    'Content-Type': 'application/json',
    'x-goog-api-key': creds.apiKey,
  };
  let res = await fetch(`${base}/models`, { headers });
  let text = await res.text().catch(() => '');

  if (!res.ok && (res.status === 404 || res.status === 405)) {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: creds.modelId,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
    });
    text = await res.text().catch(() => '');
  }

  await recordAiTokenUsage(
    { feature: 'connection_test', provider: creds.provider, modelId: creds.modelId },
    { success: res.ok, httpStatus: res.status }
  );
  if (!res.ok) {
    throw new Error(providerErrorMessage(res.status, text));
  }
  return { ok: true, message: `Connected to ${creds.provider} (${creds.modelId}).` };
}
