import AiTokenUsageLog from '../../models/AiTokenUsageLog';
import { Op } from 'sequelize';

export type AiUsageContext = {
  feature: string;
  provider: string;
  modelId: string;
};

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
    await AiTokenUsageLog.create({
      feature: ctx.feature,
      provider: ctx.provider,
      model_id: ctx.modelId,
      success: result.success,
      http_status: result.httpStatus ?? null,
      prompt_tokens: result.promptTokens ?? null,
      completion_tokens: result.completionTokens ?? null,
      total_tokens: result.totalTokens ?? null,
      cost_usd: result.costUsd ?? null,
      created_at: new Date(),
    });
  } catch (error) {
    console.warn('Failed to record AI usage:', error);
  }
}

export function parseCostUsdFromXaiImageResponse(parsed: unknown): number | null {
  const obj = parsed as { usage?: { cost_in_usd_ticks?: number; cost?: number } };
  const ticks = obj?.usage?.cost_in_usd_ticks;
  if (typeof ticks === 'number' && Number.isFinite(ticks)) return ticks / 1_000_000;
  if (typeof obj?.usage?.cost === 'number' && Number.isFinite(obj.usage.cost)) return obj.usage.cost;
  return null;
}

export function parseUsageFromGoogleGenerateContent(parsed: unknown): {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
} {
  const usage = (parsed as {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  })?.usageMetadata;
  return {
    promptTokens: usage?.promptTokenCount ?? null,
    completionTokens: usage?.candidatesTokenCount ?? null,
    totalTokens: usage?.totalTokenCount ?? null,
  };
}

export async function summarizeAiUsage(periodDays: number | null) {
  const where =
    periodDays && periodDays > 0
      ? { created_at: { [Op.gte]: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) } }
      : {};
  const rows = await AiTokenUsageLog.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 500,
  });
  const plain = rows.map((r) => r.get({ plain: true }) as {
    feature: string;
    provider: string;
    model_id: string;
    success: boolean;
    total_tokens: number | null;
    cost_usd: number | null;
    created_at: string;
  });
  const requestCount = plain.length;
  const totalTokens = plain.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
  const estimatedUsd = plain.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
  const byFeature: Record<string, { count: number; tokens: number; costUsd: number }> = {};
  for (const row of plain) {
    const key = row.feature || 'unknown';
    if (!byFeature[key]) byFeature[key] = { count: 0, tokens: 0, costUsd: 0 };
    byFeature[key].count += 1;
    byFeature[key].tokens += row.total_tokens || 0;
    byFeature[key].costUsd += row.cost_usd || 0;
  }
  return {
    requestCount,
    totalTokens,
    estimatedUsd,
    byFeature,
    recent: plain.slice(0, 20),
  };
}
