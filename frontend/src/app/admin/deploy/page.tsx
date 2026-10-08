'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import { adminLoginHref } from '@/lib/admin-session';

const LIVE_ADMIN_HREF = 'https://levolight.com/admin';

type GitCommit = {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string;
};

type DeployJobStatus = {
  status: 'idle' | 'running' | 'ok' | 'error';
  ref?: string;
  startedAt?: string;
  finishedAt?: string;
  log?: string;
  error?: string;
  message?: string;
};

type DeployStatus = {
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
  lastDeploy: DeployJobStatus;
};

function sessionExpired(status: number): boolean {
  if (status !== 401) return false;
  window.location.replace(adminLoginHref('/admin/deploy'));
  return true;
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export default function AdminDeployPage() {
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [pendingRef, setPendingRef] = useState<GitCommit | 'current' | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadStatus = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') setLoading(true);
    try {
      const response = await fetch('/api/admin/deploy', { cache: 'no-store' });
      if (sessionExpired(response.status)) return null;
      const json = (await response.json().catch(() => ({}))) as DeployStatus & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || `Could not load git status (${response.status})`);
      }
      setStatus(json);
      setError(null);
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load git status';
      setError(message);
      return null;
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus('initial');
  }, [loadStatus]);

  const running = status?.lastDeploy.status === 'running';

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      void loadStatus();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loadStatus, running]);

  async function handleFetch() {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch' }),
      });
      if (sessionExpired(response.status)) return;
      const json = (await response.json().catch(() => ({}))) as DeployStatus & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Fetch from GitHub failed');
      }
      setStatus(json);
      showSaveNotice('Fetched the latest commits from GitHub');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fetch from GitHub failed';
      setError(message);
      showSaveNotice(message, 'error');
    } finally {
      setFetching(false);
    }
  }

  async function confirmDeploy() {
    if (!pendingRef) return;
    const ref = pendingRef === 'current' ? status?.sha : pendingRef.sha;
    if (!ref) return;
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy', ref }),
      });
      if (sessionExpired(response.status)) return;
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        lastDeploy?: DeployJobStatus;
      };
      if (!response.ok) {
        throw new Error(json.error || 'Could not start deploy');
      }
      setPendingRef(null);
      showSaveNotice('Deploy started. The site will rebuild and restart.');
      await loadStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start deploy';
      setError(message);
      showSaveNotice(message, 'error');
    } finally {
      setConfirming(false);
    }
  }

  const commits = status?.commits || [];
  const currentSha = status?.sha || '';
  const pendingLabel =
    pendingRef === 'current'
      ? status?.shortSha || status?.sha || 'this version'
      : pendingRef?.shortSha || pendingRef?.sha || '';

  return (
    <div>
      <AdminPageHeader
        title="Git versions"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              helpKey="admin.deploy.refresh"
              variant="secondary"
              type="button"
              onClick={() => void loadStatus()}
              disabled={loading || fetching || running}
            >
              Refresh
            </Button>
            <Button
              helpKey="admin.deploy.fetch"
              variant="secondary"
              type="button"
              onClick={() => void handleFetch()}
              disabled={loading || fetching || running}
            >
              {fetching ? 'Fetching…' : 'Fetch from GitHub'}
            </Button>
            <Button
              helpKey="admin.deploy.live_admin"
              variant="secondary"
              href={LIVE_ADMIN_HREF}
              target="_blank"
              rel="noopener noreferrer"
            >
              Live admin
            </Button>
          </div>
        }
      />

      {error ? (
        <AlertBanner className="mb-6">
          <p>{error}</p>
        </AlertBanner>
      ) : null}

      <Card className="mb-8">
        {loading && !status ? (
          <p className="text-sm text-gray-500">Loading git status…</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Current version</dt>
              <dd className="mt-1 font-mono text-sm text-gray-900">{status?.shortSha || '—'}</dd>
              {status?.subject ? <dd className="mt-1 text-sm text-gray-700">{status.subject}</dd> : null}
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Branch</dt>
              <dd className="mt-1 text-sm text-gray-900">{status?.branch || 'detached HEAD'}</dd>
              {status?.remote ? (
                <dd className="mt-1 truncate font-mono text-xs text-gray-500">{status.remote}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Author</dt>
              <dd className="mt-1 text-sm text-gray-900">{status?.author || '—'}</dd>
              <dd className="mt-1 text-sm text-gray-500">{formatWhen(status?.date)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Deploy</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {status?.canDeploy
                  ? 'This server can deploy a git version to production.'
                  : 'Listing and fetch work here. Production deploy only runs on the VPS.'}
              </dd>
              {status?.dirty ? (
                <dd className="mt-1 text-sm text-amber-700">This checkout has uncommitted files.</dd>
              ) : null}
            </div>
          </dl>
        )}
        {status?.canDeploy && status.sha ? (
          <div className="mt-4">
            <Button
              helpKey="admin.deploy.redeploy"
              type="button"
              onClick={() => setPendingRef('current')}
              disabled={running || fetching}
            >
              Redeploy current version
            </Button>
          </div>
        ) : null}
      </Card>

      {status?.lastDeploy.status && status.lastDeploy.status !== 'idle' ? (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold">Last deploy</h2>
          <p className="mt-2 text-sm text-gray-700">
            {status.lastDeploy.status === 'running'
              ? 'Running'
              : status.lastDeploy.status === 'ok'
                ? 'Finished'
                : 'Failed'}
            {status.lastDeploy.ref ? (
              <>
                {' '}
                <span className="font-mono">{status.lastDeploy.ref}</span>
              </>
            ) : null}
          </p>
          {status.lastDeploy.error ? (
            <p className="mt-2 text-sm text-red-700">{status.lastDeploy.error}</p>
          ) : null}
          {status.lastDeploy.log ? (
            <pre className="mt-3 max-h-64 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
              {status.lastDeploy.log}
            </pre>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Recent commits</h2>
        <AdminTable columns={['Commit', 'Message', 'Author', 'When', '']} loading={loading} empty={!loading && commits.length === 0}>
          {commits.map((commit) => {
            const current = commit.sha === currentSha;
            return (
              <tr key={commit.sha} className={current ? 'bg-gray-50' : undefined}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {commit.shortSha}
                  {current ? <span className="ml-2 text-xs font-sans font-medium text-gray-500">Current</span> : null}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{commit.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{commit.author}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatWhen(commit.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    helpKey="admin.deploy.deploy"
                    variant="secondary"
                    type="button"
                    onClick={() => setPendingRef(commit)}
                    disabled={!status?.canDeploy || running || fetching}
                  >
                    {current ? 'Redeploy' : 'Deploy'}
                  </Button>
                </td>
              </tr>
            );
          })}
        </AdminTable>
      </Card>

      <ConfirmDialog
        open={pendingRef !== null}
        title="Deploy this version?"
        message={`This checks out ${pendingLabel} on the VPS, rebuilds the site, and restarts production. The public site may be briefly unavailable.`}
        confirmLabel="Deploy"
        confirmHelpKey="admin.deploy.confirm"
        cancelHelpKey="admin.deploy.cancel"
        confirmVariant="primary"
        busy={confirming}
        onConfirm={() => void confirmDeploy()}
        onCancel={() => {
          if (!confirming) setPendingRef(null);
        }}
      />
    </div>
  );
}
