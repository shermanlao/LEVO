import AiTokenUsageLog from '../../models/AiTokenUsageLog';
import { Op } from 'sequelize';

/** xAI: 1 USD = 10^10 ticks. See https://docs.x.ai/developers/cost-tracking */
export const XAI_USD_TICKS_PER_DOLLAR = 10_000_000_000;
/** Previous bug stored ticks / 1e6 (10,000× too high). */
const LEGACY_XAI_TICK_DIVISOR = 1_000_000;
const LEGACY_XAI_COST_SCALE = XAI_USD_TICKS_PER_DOLLAR / LEGACY_XAI_TICK_DIVISOR;
/** A real xAI image/chat call in this app is well under $1; old rows are $500–$600. */
const LEGACY_XAI_COST_MIN_USD = 1;

const GEMINI_FLASH_IMAGE_INPUT_PER_M = 0.5;
const GEMINI_FLASH_IMAGE_TEXT_OUT_PER_M = 3;
const GEMINI_FLASH_IMAGE_IMAGE_OUT_PER_M = 60;

export type AiUsageContext = {
  feature: string;
  provider: string;
  modelId: string;
};

export type ParsedTokenUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
};

export type UsageLogRow = {
  feature: string;
  provider?: string | null;
  model_id?: string | null;
  success?: boolean;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  cost_usd?: number | null;
  created_at?: string | Date;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function usageObject(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const rec = parsed as { usage?: unknown; usageMetadata?: unknown };
  if (rec.usage && typeof rec.usage === 'object') return rec.usage as Record<string, unknown>;
  if (rec.usageMetadata && typeof rec.usageMetadata === 'object') {
    return rec.usageMetadata as Record<string, unknown>;
  }
  return null;
}

function tokensFromUsage(usage: Record<string, unknown> | null): Omit<ParsedTokenUsage, 'costUsd'> {
  if (!usage) {
    return { promptTokens: null, completionTokens: null, totalTokens: null };
  }
  const promptTokens =
    finiteNumber(usage.prompt_tokens) ??
    finiteNumber(usage.input_tokens) ??
    finiteNumber(usage.promptTokenCount);
  const completionTokens =
    finiteNumber(usage.completion_tokens) ??
    finiteNumber(usage.output_tokens) ??
    finiteNumber(usage.candidatesTokenCount);
  const thoughts = finiteNumber(usage.thoughtsTokenCount) ?? 0;
  const reportedTotal =
    finiteNumber(usage.total_tokens) ?? finiteNumber(usage.totalTokenCount);
  const totalTokens =
    reportedTotal ??
    (promptTokens != null || completionTokens != null
      ? (promptTokens || 0) + (completionTokens || 0) + thoughts
      : null);
  return { promptTokens, completionTokens, totalTokens };
}

export function parseCostUsdFromXaiResponse(parsed: unknown): number | null {
  const usage = usageObject(parsed);
  if (!usage) return null;
  const ticks = finiteNumber(usage.cost_in_usd_ticks);
  if (ticks != null && ticks >= 0) return ticks / XAI_USD_TICKS_PER_DOLLAR;
  const cost = finiteNumber(usage.cost);
  if (cost != null && cost >= 0 && cost < LEGACY_XAI_COST_MIN_USD) return cost;
  return null;
}

/** @deprecated Use parseCostUsdFromXaiResponse */
export function parseCostUsdFromXaiImageResponse(parsed: unknown): number | null {
  return parseCostUsdFromXaiResponse(parsed);
}

export function parseUsageFromXaiResponse(parsed: unknown): ParsedTokenUsage {
  const usage = usageObject(parsed);
  return {
    ...tokensFromUsage(usage),
    costUsd: parseCostUsdFromXaiResponse(parsed),
  };
}

type ModalityCount = { modality?: string; tokenCount?: number };

function modalityTokens(details: unknown, modality: string): number {
  if (!Array.isArray(details)) return 0;
  return details.reduce((sum, item) => {
    const row = item as ModalityCount;
    if (String(row?.modality || '').toUpperCase() !== modality) return sum;
    return sum + (finiteNumber(row.tokenCount) || 0);
  }, 0);
}

export function isGoogleImageModel(modelId?: string | null): boolean {
  const id = String(modelId || '').toLowerCase();
  return id.includes('image') || id.includes('banana');
}

export function estimateGoogleImageCostUsd(opts: {
  promptTokens?: number | null;
  completionTokens?: number | null;
  thoughtsTokens?: number | null;
  imageOutputTokens?: number | null;
  textOutputTokens?: number | null;
}): number {
  const input = Math.max(0, opts.promptTokens || 0);
  const thoughts = Math.max(0, opts.thoughtsTokens || 0);
  let imageOut = Math.max(0, opts.imageOutputTokens || 0);
  let textOut = Math.max(0, opts.textOutputTokens || 0);
  if (imageOut === 0 && textOut === 0) {
    imageOut = Math.max(0, opts.completionTokens || 0);
  }
  return (
    (input * GEMINI_FLASH_IMAGE_INPUT_PER_M +
      (textOut + thoughts) * GEMINI_FLASH_IMAGE_TEXT_OUT_PER_M +
      imageOut * GEMINI_FLASH_IMAGE_IMAGE_OUT_PER_M) /
    1_000_000
  );
}

export function parseUsageFromGoogleGenerateContent(parsed: unknown): ParsedTokenUsage {
  const usage = (parsed as {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
      thoughtsTokenCount?: number;
      candidatesTokensDetails?: ModalityCount[];
    };
  })?.usageMetadata;
  const promptTokens = finiteNumber(usage?.promptTokenCount);
  const completionTokens = finiteNumber(usage?.candidatesTokenCount);
  const thoughtsTokens = finiteNumber(usage?.thoughtsTokenCount);
  const totalTokens =
    finiteNumber(usage?.totalTokenCount) ??
    (promptTokens != null || completionTokens != null
      ? (promptTokens || 0) + (completionTokens || 0) + (thoughtsTokens || 0)
      : null);
  const imageOutputTokens = modalityTokens(usage?.candidatesTokensDetails, 'IMAGE');
  const textOutputTokens = modalityTokens(usage?.candidatesTokensDetails, 'TEXT');
  const costUsd =
    promptTokens != null || completionTokens != null || imageOutputTokens > 0
      ? estimateGoogleImageCostUsd({
          promptTokens,
          completionTokens,
          thoughtsTokens,
          imageOutputTokens: imageOutputTokens || null,
          textOutputTokens: textOutputTokens || null,
        })
      : null;
  return { promptTokens, completionTokens, totalTokens, costUsd };
}

export function isLegacyXaiStoredCost(provider: string | null | undefined, costUsd: number): boolean {
  return String(provider || '').toLowerCase() === 'xai' && costUsd >= LEGACY_XAI_COST_MIN_USD;
}

export function normalizeStoredCostUsd(provider: string | null | undefined, costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;
  if (isLegacyXaiStoredCost(provider, costUsd)) return costUsd / LEGACY_XAI_COST_SCALE;
  return costUsd;
}

function chatRatePerMillion(modelId?: string | null): { input: number; output: number } | null {
  const id = String(modelId || '').toLowerCase();
  if (id.includes('grok-4.3')) return { input: 1.25, output: 2.5 };
  if (id.includes('grok-4')) return { input: 1.25, output: 2.5 };
  return null;
}

export function estimateCostUsdFromTokens(row: UsageLogRow): number | null {
  const prompt = row.prompt_tokens || 0;
  const completion = row.completion_tokens || 0;
  if (prompt <= 0 && completion <= 0) return null;
  const provider = String(row.provider || '').toLowerCase();
  if (provider === 'google' && isGoogleImageModel(row.model_id)) {
    return estimateGoogleImageCostUsd({
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
    });
  }
  const rate = chatRatePerMillion(row.model_id);
  if (!rate) return null;
  return (prompt * rate.input + completion * rate.output) / 1_000_000;
}

export function effectiveCostUsd(row: UsageLogRow): number {
  const stored = finiteNumber(row.cost_usd);
  if (stored != null && stored > 0) {
    return normalizeStoredCostUsd(row.provider, stored);
  }
  return estimateCostUsdFromTokens(row) ?? 0;
}

function roundUsd(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

export function summarizeUsageRows(rows: UsageLogRow[]) {
  const requestCount = rows.length;
  const totalTokens = rows.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
  let estimatedUsd = 0;
  const byFeature: Record<string, { count: number; tokens: number; costUsd: number }> = {};
  for (const row of rows) {
    const cost = effectiveCostUsd(row);
    estimatedUsd += cost;
    const key = row.feature || 'unknown';
    if (!byFeature[key]) byFeature[key] = { count: 0, tokens: 0, costUsd: 0 };
    byFeature[key].count += 1;
    byFeature[key].tokens += row.total_tokens || 0;
    byFeature[key].costUsd += cost;
  }
  for (const row of Object.values(byFeature)) {
    row.costUsd = roundUsd(row.costUsd);
  }
  return {
    requestCount,
    totalTokens,
    estimatedUsd: roundUsd(estimatedUsd),
    byFeature,
    recent: rows.slice(0, 20),
  };
}

export async function recordAiTokenUsage(
  ctx: AiUsageContext,
  result: {
    success: boolean;
    httpStatus?: number;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    costUsd?: number | null;
  }
): Promise<void> {
  try {
    const costUsd =
      finiteNumber(result.costUsd) ??
      estimateCostUsdFromTokens({
        feature: ctx.feature,
        provider: ctx.provider,
        model_id: ctx.modelId,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: result.totalTokens,
      });
    await AiTokenUsageLog.create({
      feature: ctx.feature,
      provider: ctx.provider,
      model_id: ctx.modelId,
      success: result.success,
      http_status: result.httpStatus ?? null,
      prompt_tokens: result.promptTokens ?? null,
      completion_tokens: result.completionTokens ?? null,
      total_tokens: result.totalTokens ?? null,
      cost_usd: costUsd,
      created_at: new Date(),
    });
  } catch (error) {
    console.warn('Failed to record AI usage:', error);
  }
}

async function rewriteLegacyXaiCosts(): Promise<void> {
  try {
    const rows = await AiTokenUsageLog.findAll({
      where: { provider: 'xai', cost_usd: { [Op.gte]: LEGACY_XAI_COST_MIN_USD } },
    });
    for (const row of rows) {
      const current = finiteNumber(row.get('cost_usd'));
      if (current == null || !isLegacyXaiStoredCost('xai', current)) continue;
      await row.update({ cost_usd: current / LEGACY_XAI_COST_SCALE });
    }
  } catch (error) {
    console.warn('Failed to rewrite legacy xAI usage costs:', error);
  }
}

export async function summarizeAiUsage(periodDays: number | null) {
  await rewriteLegacyXaiCosts();
  const where =
    periodDays && periodDays > 0
      ? { created_at: { [Op.gte]: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) } }
      : {};
  const rows = await AiTokenUsageLog.findAll({
    where,
    order: [['created_at', 'DESC']],
  });
  const plain = rows.map((r) => r.get({ plain: true }) as UsageLogRow);
  return summarizeUsageRows(plain);
}
