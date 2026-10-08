import { execFile, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const STANDARD_DEPLOY_BIN = '/usr/local/sbin/levo-deploy';
const STALE_RUNNING_MS = 20 * 60 * 1000;
const LOG_MAX = 8000;

export type GitCommit = {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string;
};

export type DeployJobStatus = {
  status: 'idle' | 'running' | 'ok' | 'error';
  ref?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  exitCode?: number | null;
  log?: string;
  error?: string;
  message?: string;
};

export type GitDeployStatus = {
  gitRoot: string | null;
  sha: string | null;
  shortSha: string | null;
  subject: string | null;
  author: string | null;
  date: string | null;
  branch: string | null;
  dirty: boolean;
  remote: string | null;
  commits: GitCommit[];
  canDeploy: boolean;
  deployBin: string | null;
  lastDeploy: DeployJobStatus;
};

let spawnHeld = false;

export function parseGitRef(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const ref = raw.trim();
  if (!ref || ref.length > 200) return null;
  if (ref.startsWith('-')) return null;
  if (ref.includes('..') || ref.includes('\\') || ref.includes('@{')) return null;
  if (!/^[0-9A-Za-z][0-9A-Za-z._/-]*$/.test(ref)) return null;
  return ref;
}

export function sanitizeRemoteUrl(url: string): string {
  return url.replace(/^(https?:\/\/)([^/@]+)@/i, '$1');
}

export function deployStatusPath(): string {
  return path.join(os.tmpdir(), 'levo-deploy-status.json');
}

function hasGit(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}

export function resolveGitRoot(): string | null {
  const envRoot = process.env.LEVO_GIT_ROOT?.trim();
  if (envRoot && hasGit(envRoot)) return path.resolve(envRoot);
  const starts = [
    process.cwd(),
    path.resolve(__dirname, '../../..'),
    path.resolve(__dirname, '../../../..'),
  ];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i += 1) {
      if (hasGit(dir)) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

export function resolveDeployBin(): string | null {
  const envBin = process.env.LEVO_DEPLOY_CMD?.trim();
  if (envBin) {
    if (!path.isAbsolute(envBin)) return null;
    if (envBin.includes('\0') || /\s/.test(envBin)) return null;
    if (!fs.existsSync(envBin)) return null;
    return envBin;
  }
  if (fs.existsSync(STANDARD_DEPLOY_BIN)) return STANDARD_DEPLOY_BIN;
  return null;
}

function readDeployStatus(): DeployJobStatus {
  try {
    const raw = fs.readFileSync(deployStatusPath(), 'utf8');
    const parsed = JSON.parse(raw) as DeployJobStatus;
    if (!parsed || typeof parsed !== 'object') return { status: 'idle' };
    const status = parsed.status;
    if (status !== 'running' && status !== 'ok' && status !== 'error') return { status: 'idle' };
    if (status === 'running' && parsed.startedAt) {
      const started = Date.parse(parsed.startedAt);
      if (Number.isFinite(started) && Date.now() - started > STALE_RUNNING_MS) {
        return {
          ...parsed,
          status: 'error',
          error: parsed.error || 'Deploy timed out',
          finishedAt: parsed.finishedAt || new Date().toISOString(),
        };
      }
    }
    return { ...parsed, status };
  } catch {
    return { status: 'idle' };
  }
}

function writeDeployStatus(next: DeployJobStatus): void {
  const payload: DeployJobStatus = {
    ...next,
    updatedAt: new Date().toISOString(),
  };
  if (payload.log && payload.log.length > LOG_MAX) {
    payload.log = payload.log.slice(-LOG_MAX);
  }
  fs.writeFileSync(deployStatusPath(), `${JSON.stringify(payload)}\n`, 'utf8');
}

function gitEnv(root: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const key = path.join(root, '.ssh', 'github_deploy');
  if (fs.existsSync(key)) {
    env.GIT_SSH_COMMAND = `ssh -i "${key}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`;
  }
  return env;
}

async function execGit(root: string, args: readonly string[], timeout = 60_000): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd: root,
    env: gitEnv(root),
    timeout,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  return String(stdout || '').trim();
}

function parseCommits(stdout: string): GitCommit[] {
  const commits: GitCommit[] = [];
  const seen = new Set<string>();
  for (const line of stdout.split('\n')) {
    if (!line) continue;
    const [sha, shortSha, subject, author, date] = line.split('\x1f');
    if (!sha || !shortSha || seen.has(sha)) continue;
    seen.add(sha);
    commits.push({
      sha,
      shortSha,
      subject: subject || '',
      author: author || '',
      date: date || '',
    });
  }
  return commits;
}

async function logRefs(root: string): Promise<string[]> {
  const refs = ['HEAD'];
  for (const extra of ['origin/main', 'origin/HEAD']) {
    try {
      await execGit(root, ['rev-parse', '--verify', extra]);
      refs.push(extra);
    } catch {
      // origin may not exist on a local-only clone
    }
  }
  return refs;
}

export async function readGitDeployStatus(): Promise<GitDeployStatus> {
  const gitRoot = resolveGitRoot();
  const deployBin = resolveDeployBin();
  const lastDeploy = readDeployStatus();
  const empty: GitDeployStatus = {
    gitRoot,
    sha: null,
    shortSha: null,
    subject: null,
    author: null,
    date: null,
    branch: null,
    dirty: false,
    remote: null,
    commits: [],
    canDeploy: Boolean(deployBin),
    deployBin,
    lastDeploy,
  };
  if (!gitRoot) return empty;

  const sha = await execGit(gitRoot, ['rev-parse', 'HEAD']);
  const shortSha = await execGit(gitRoot, ['rev-parse', '--short', 'HEAD']);
  const subject = await execGit(gitRoot, ['log', '-1', '--format=%s']);
  const author = await execGit(gitRoot, ['log', '-1', '--format=%an']);
  const date = await execGit(gitRoot, ['log', '-1', '--format=%aI']);
  let branch: string | null = null;
  try {
    const name = await execGit(gitRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
    branch = name === 'HEAD' ? null : name;
  } catch {
    branch = null;
  }
  let dirty = false;
  try {
    dirty = Boolean(await execGit(gitRoot, ['status', '--porcelain']));
  } catch {
    dirty = false;
  }
  let remote: string | null = null;
  try {
    remote = sanitizeRemoteUrl(await execGit(gitRoot, ['remote', 'get-url', 'origin']));
  } catch {
    remote = null;
  }
  const refs = await logRefs(gitRoot);
  const commits = parseCommits(
    await execGit(gitRoot, [
      'log',
      '--date-order',
      '-n',
      '40',
      '--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI',
      ...refs,
    ])
  );

  return {
    gitRoot,
    sha,
    shortSha,
    subject,
    author,
    date,
    branch,
    dirty,
    remote,
    commits,
    canDeploy: Boolean(deployBin),
    deployBin,
    lastDeploy,
  };
}

export async function fetchGitRemote(): Promise<{ ok: true; fetched: string }> {
  const gitRoot = resolveGitRoot();
  if (!gitRoot) {
    throw Object.assign(new Error('Git checkout was not found'), { status: 500 });
  }
  const stdout = await execGit(gitRoot, ['fetch', 'origin', '--prune'], 90_000);
  return { ok: true, fetched: stdout || 'Fetched origin' };
}

function isDeployRunning(): boolean {
  if (spawnHeld) return true;
  return readDeployStatus().status === 'running';
}

export function startDeploy(ref: string): DeployJobStatus {
  const parsed = parseGitRef(ref);
  if (!parsed) {
    throw Object.assign(new Error('Invalid git ref'), { status: 400 });
  }
  const bin = resolveDeployBin();
  if (!bin) {
    throw Object.assign(
      new Error('Deploy is only available on the VPS (missing /usr/local/sbin/levo-deploy)'),
      { status: 400 }
    );
  }
  if (isDeployRunning()) {
    throw Object.assign(new Error('A deploy is already running'), { status: 409 });
  }

  const startedAt = new Date().toISOString();
  const initial: DeployJobStatus = {
    status: 'running',
    ref: parsed,
    startedAt,
    log: '',
  };
  writeDeployStatus(initial);
  spawnHeld = true;

  const useSudo = bin === STANDARD_DEPLOY_BIN;
  const command = useSudo ? 'sudo' : bin;
  const args = useSudo ? ['-n', bin, '--background', parsed] : [parsed];
  let child;
  try {
    child = spawn(command, args, {
      cwd: '/',
      env: process.env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (error) {
    spawnHeld = false;
    writeDeployStatus({
      status: 'error',
      ref: parsed,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  let log = '';
  const append = (chunk: Buffer) => {
    log = `${log}${chunk.toString()}`.slice(-LOG_MAX);
    writeDeployStatus({
      status: 'running',
      ref: parsed,
      startedAt,
      log,
    });
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  child.on('error', (error) => {
    spawnHeld = false;
    writeDeployStatus({
      status: 'error',
      ref: parsed,
      startedAt,
      finishedAt: new Date().toISOString(),
      log,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  child.on('exit', (code) => {
    spawnHeld = false;
    if (code === 0) {
      const current = readDeployStatus();
      if (current.status === 'running') {
        writeDeployStatus({
          ...current,
          ref: parsed,
          startedAt,
          log: log || current.log,
        });
        return;
      }
    }
    writeDeployStatus({
      status: code === 0 ? 'ok' : 'error',
      ref: parsed,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: code,
      log,
      error: code === 0 ? undefined : `Deploy exited ${code ?? 'unknown'}`,
    });
  });
  child.unref();
  return initial;
}
