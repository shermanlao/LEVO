import { Request, Response } from 'express';
import { errorMessage, clientError } from '../lib/errors';
import { generateSizeDrawing } from '../lib/ai/sizeDrawingAiAssist';
import { generateAppearancePhoto } from '../lib/ai/appearancePhotoAi';
import { editProductPhoto } from '../lib/ai/productPhotoAiEdit';
import { generateDatasheetLabel } from '../lib/ai/datasheetLabelAi';
import { generateDescriptionPhrase } from '../lib/ai/descriptionPhraseAi';

export const postGenerateSizeDrawing = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, size, cuthole } = (req.body || {}) as {
      imageDataUrl?: string;
      size?: string;
      cuthole?: string | null;
    };
    const result = await generateSizeDrawing({ imageDataUrl: imageDataUrl || '', size: size || '', cuthole });
    res.json(result);
  } catch (error) {
    const message = errorMessage(error);
    const status = /not configured/i.test(message) ? 503 : /required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: status >= 500 ? clientError(error) : message });
  }
};

export const postRefineSizeDrawing = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, size, cuthole, instruction } = (req.body || {}) as {
      imageDataUrl?: string;
      size?: string;
      cuthole?: string | null;
      instruction?: string;
    };
    const result = await generateSizeDrawing({
      imageDataUrl: imageDataUrl || '',
      size: size || '',
      cuthole,
      refineInstruction: instruction,
    });
    res.json(result);
  } catch (error) {
    const message = errorMessage(error);
    const status = /not configured/i.test(message) ? 503 : /required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: status >= 500 ? clientError(error) : message });
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
    const message = errorMessage(error);
    const status = /not configured/i.test(message) ? 503 : /required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: status >= 500 ? clientError(error) : message });
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
    const message = errorMessage(error);
    const status = /not configured/i.test(message) ? 503 : /required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: status >= 500 ? clientError(error) : message });
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
    const message = errorMessage(error);
    const status = /not configured/i.test(message) ? 503 : /required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: status >= 500 ? clientError(error) : message });
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
    const message = errorMessage(error);
    const status = /not configured/i.test(message) ? 503 : /required/i.test(message) ? 400 : 500;
    res.status(status).json({ error: status >= 500 ? clientError(error) : message });
  }
};
