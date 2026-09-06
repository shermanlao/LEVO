import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  effectiveCostUsd,
  estimateGoogleImageCostUsd,
  normalizeStoredCostUsd,
  parseCostUsdFromXaiResponse,
  parseUsageFromGoogleGenerateContent,
  parseUsageFromXaiResponse,
  summarizeUsageRows,
  XAI_USD_TICKS_PER_DOLLAR,
} from './aiUsage';

describe('xAI billed cost', () => {
  it('converts cost_in_usd_ticks with 1e10 ticks per dollar', () => {
    assert.equal(parseCostUsdFromXaiResponse({ usage: { cost_in_usd_ticks: 200_000_000 } }), 0.02);
    assert.equal(
      parseCostUsdFromXaiResponse({ usage: { cost_in_usd_ticks: 37_756_000 } }),
      37_756_000 / XAI_USD_TICKS_PER_DOLLAR
    );
    assert.equal(parseCostUsdFromXaiResponse({ usage: { cost_in_usd_ticks: 158_500 } }), 158_500 / 1e10);
  });

  it('does not treat ticks as microdollars', () => {
    const usd = parseCostUsdFromXaiResponse({ usage: { cost_in_usd_ticks: 600_000_000 } });
    assert.equal(usd, 0.06);
    assert.notEqual(usd, 600);
  });

  it('reads OpenAI-style token fields on chat completions', () => {
    const usage = parseUsageFromXaiResponse({
      usage: {
        prompt_tokens: 849,
        completion_tokens: 111,
        total_tokens: 960,
        cost_in_usd_ticks: 1_337_500,
      },
    });
    assert.equal(usage.promptTokens, 849);
    assert.equal(usage.completionTokens, 111);
    assert.equal(usage.totalTokens, 960);
    assert.equal(usage.costUsd, 0.00013375);
  });
});

describe('legacy xAI stored costs', () => {
  it('scales $500–$600 image rows back to billed dollars', () => {
    assert.equal(normalizeStoredCostUsd('xai', 500), 0.05);
    assert.equal(normalizeStoredCostUsd('xai', 600), 0.06);
    assert.equal(normalizeStoredCostUsd('xai', 0.06), 0.06);
    assert.equal(normalizeStoredCostUsd('google', 600), 600);
  });
});

describe('Google image estimate', () => {
  it('prices IMAGE output tokens at $60 / 1M and input at $0.50 / 1M', () => {
    const usage = parseUsageFromGoogleGenerateContent({
      usageMetadata: {
        promptTokenCount: 36,
        candidatesTokenCount: 1211,
        totalTokenCount: 1405,
        thoughtsTokenCount: 158,
        candidatesTokensDetails: [
          { modality: 'IMAGE', tokenCount: 1120 },
          { modality: 'TEXT', tokenCount: 91 },
        ],
      },
    });
    assert.equal(usage.promptTokens, 36);
    assert.equal(usage.completionTokens, 1211);
    assert.equal(usage.totalTokens, 1405);
    const expected = estimateGoogleImageCostUsd({
      promptTokens: 36,
      thoughtsTokens: 158,
      imageOutputTokens: 1120,
      textOutputTokens: 91,
    });
    assert.equal(usage.costUsd, expected);
    assert.ok(Math.abs((usage.costUsd || 0) - 0.067965) < 0.000001);
  });
});

describe('usage summary', () => {
  it('sums every row and corrects legacy xAI costs', () => {
    const summary = summarizeUsageRows([
      {
        feature: 'appearance_photo_generate',
        provider: 'xai',
        model_id: 'grok-imagine-image-quality',
        total_tokens: null,
        cost_usd: 600,
      },
      {
        feature: 'datasheet_label_generate',
        provider: 'xai',
        model_id: 'grok-imagine-image-quality',
        total_tokens: null,
        cost_usd: 500,
      },
      {
        feature: 'description_phrase_generate',
        provider: 'xai',
        model_id: 'grok-4.3',
        prompt_tokens: 849,
        completion_tokens: 111,
        total_tokens: 960,
        cost_usd: null,
      },
    ]);
    assert.equal(summary.requestCount, 3);
    assert.equal(summary.totalTokens, 960);
    assert.equal(summary.byFeature.appearance_photo_generate.costUsd, 0.06);
    assert.equal(summary.byFeature.datasheet_label_generate.costUsd, 0.05);
    assert.ok(summary.byFeature.description_phrase_generate.costUsd > 0);
    assert.ok(Math.abs(summary.estimatedUsd - (0.06 + 0.05 + effectiveCostUsd({
      feature: 'description_phrase_generate',
      provider: 'xai',
      model_id: 'grok-4.3',
      prompt_tokens: 849,
      completion_tokens: 111,
      cost_usd: null,
    }))) < 1e-12);
  });
});
