import { Request, Response } from 'express';
import { errorMessage } from '../lib/errors';
import { generateSizeDrawing } from '../lib/ai/sizeDrawingAiAssist';
import { generateAppearancePhoto } from '../lib/ai/appearancePhotoAi';
import { editProductPhoto } from '../lib/ai/productPhotoAiEdit';
import { stylizeProductPhoto } from '../lib/ai/productPhotoStyleAi';
import { generateDatasheetLabel } from '../lib/ai/datasheetLabelAi';
import { generateDescriptionPhrase } from '../lib/ai/descriptionPhraseAi';

function respondAiFailure(res: Response, error: unknown) {
  const raw = errorMessage(error);
  console.error('[ai]', raw);
  const message = raw.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 400);
  if (/not configured/i.test(message)) {
    return res.status(503).json({ error: message });
  }
  if (/required|Expected a base64|not a valid JPEG|Invalid data URL/i.test(message)) {
    return res.status(400).json({ error: message });
  }
  const status = /xAI|Google|Imagine|Nano Banana|provider|exhausted|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(
    message
  )
    ? 502
    : 500;
  return res.status(status).json({ error: message || 'Style match failed' });
}

export const postGenerateSizeDrawing = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, size, cuthole, description, fixtureDescription } = (req.body || {}) as {
      imageDataUrl?: string;
      size?: string;
      cuthole?: string | null;
      description?: string | null;
      fixtureDescription?: string | null;
    };
    const result = await generateSizeDrawing({
      imageDataUrl: imageDataUrl || '',
      size: size || '',
      cuthole,
      description,
      fixtureDescription,
    });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};

export const postRefineSizeDrawing = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, size, cuthole, description, fixtureDescription, instruction } = (req.body ||
      {}) as {
      imageDataUrl?: string;
      size?: string;
      cuthole?: string | null;
      description?: string | null;
      fixtureDescription?: string | null;
      instruction?: string;
    };
    const result = await generateSizeDrawing({
      imageDataUrl: imageDataUrl || '',
      size: size || '',
      cuthole,
      description,
      fixtureDescription,
      refineInstruction: instruction,
    });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};

export const postGenerateDatasheetLabel = async (req: Request, res: Response) => {
  try {
    const { text, instruction, imageDataUrl } = (req.body || {}) as {
      text?: string;
      instruction?: string | null;
      imageDataUrl?: string | null;
    };
    const result = await generateDatasheetLabel({
      text: text || '',
      instruction,
      imageDataUrl,
    });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};

export const postGenerateAppearancePhoto = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, colour, trim_color, reflector_finish } = (req.body || {}) as {
      imageDataUrl?: string;
      colour?: string | null;
      trim_color?: string | null;
      reflector_finish?: string | null;
    };
    const result = await generateAppearancePhoto({
      imageDataUrl: imageDataUrl || '',
      colour,
      trim_color,
      reflector_finish,
    });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};

export const postStylizeProductPhoto = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, imageUrl, fixtureDescription } = (req.body || {}) as {
      imageDataUrl?: string;
      imageUrl?: string;
      fixtureDescription?: string;
    };
    const result = await stylizeProductPhoto({ imageDataUrl, imageUrl, fixtureDescription });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};

export const postEditProductPhoto = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, instruction, photoType } = (req.body || {}) as {
      imageDataUrl?: string;
      instruction?: string;
      photoType?: string | null;
    };
    const result = await editProductPhoto({
      imageDataUrl: imageDataUrl || '',
      instruction: instruction || '',
      photoType,
    });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};

export const postGenerateDescriptionPhrase = async (req: Request, res: Response) => {
  try {
    const { guide, seriesName, typeName, fields, existing } = (req.body || {}) as {
      guide?: string;
      seriesName?: string;
      typeName?: string;
      fields?: Array<{ key?: string; label?: string; values?: string[] }>;
      existing?: string;
    };
    const result = await generateDescriptionPhrase({
      guide: guide || '',
      seriesName: seriesName || '',
      typeName,
      fields: Array.isArray(fields)
        ? fields.map((field) => ({
            key: String(field.key || ''),
            label: String(field.label || field.key || ''),
            values: Array.isArray(field.values) ? field.values.map((value) => String(value)) : [],
          }))
        : [],
      existing,
    });
    res.json(result);
  } catch (error) {
    respondAiFailure(res, error);
  }
};
