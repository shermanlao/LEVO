import { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { loadRolePageMatrix, saveRolePageMatrix } from '../lib/adminPageAccess';
import { defaultRolePageMatrix } from '../lib/shared/admin-roles';

export const listRolePages = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await loadRolePageMatrix() });
});

export const updateRolePages = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' && 'data' in req.body ? req.body.data : req.body;
  const data = await saveRolePageMatrix(body);
  res.json({ data });
});

export const resetRolePages = asyncHandler(async (_req: Request, res: Response) => {
  const data = await saveRolePageMatrix(defaultRolePageMatrix());
  res.json({ data });
});
