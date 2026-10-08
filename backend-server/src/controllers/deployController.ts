import { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { fetchGitRemote, parseGitRef, readGitDeployStatus, startDeploy } from '../lib/gitDeploy';

export const getDeployStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await readGitDeployStatus());
});

export const postDeployAction = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = String((body as { action?: unknown }).action || '').trim();

  if (action === 'fetch') {
    try {
      const result = await fetchGitRemote();
      const status = await readGitDeployStatus();
      res.json({ ...status, fetch: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Git fetch failed';
      res.status(502).json({ error: message });
    }
    return;
  }

  if (action === 'deploy') {
    const ref = parseGitRef((body as { ref?: unknown }).ref);
    if (!ref) {
      res.status(400).json({ error: 'Choose a git branch or commit SHA to deploy' });
      return;
    }
    try {
      const lastDeploy = startDeploy(ref);
      res.status(202).json({ started: true, lastDeploy });
    } catch (error) {
      const status = Number((error as { status?: number }).status) || 500;
      const message = error instanceof Error ? error.message : 'Deploy failed';
      res.status(status).json({ error: message });
    }
    return;
  }

  res.status(400).json({ error: 'Unknown action' });
});
