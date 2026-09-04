import { Response } from 'express';
import { PUBLIC_LIST_CACHE } from './shared/cache-constants';

export { PUBLIC_LIST_CACHE };

export function setPublicListCache(res: Response): void {
  res.setHeader('Cache-Control', PUBLIC_LIST_CACHE);
}
