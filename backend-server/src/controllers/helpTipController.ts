import { Request, Response } from 'express';
import HelpTip from '../models/HelpTip';
import { asyncHandler } from '../lib/asyncHandler';
import { setPublicListCache } from '../lib/publicCache';

export const getHelpTips = asyncHandler(async (_req: Request, res: Response) => {
  const tips = await HelpTip.findAll();
  setPublicListCache(res);
  res.json({
    data: tips.map((tip) => {
      const row = tip.get({ plain: true }) as { helpKey: string; title: string; body: string };
      return { helpKey: row.helpKey, title: row.title, body: row.body };
    }),
  });
});
