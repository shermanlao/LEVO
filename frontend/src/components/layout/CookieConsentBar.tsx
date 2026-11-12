'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useAdminMe } from '@/lib/use-admin-me';

type Choice = 'all' | 'necessary';

export default function CookieConsentBar() {
  const pathname = usePathname() || '';
  const { session } = useAdminMe();
  const [ready, setReady] = useState(false);
  const [decided, setDecided] = useState(true);
  const [notice, setNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const adminPath = pathname.startsWith('/admin');
  const signedIn = session === 'ok';
  const hidden = !ready || decided || adminPath || signedIn;

  useEffect(() => {
    if (hidden) {
      document.documentElement.style.setProperty('--cookie-bar-space', '0px');
      return;
    }
    const node = barRef.current;
    if (!node) return;
    const apply = () => {
      document.documentElement.style.setProperty('--cookie-bar-space', `${node.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--cookie-bar-space', '0px');
    };
  }, [hidden, settingsOpen, notice]);

  useEffect(() => {
    if (adminPath || signedIn) {
      setReady(true);
      setDecided(true);
      return;
    }
    if (session === 'unknown') return;
    let cancelled = false;
    fetch('/api/cookie-consent', { cache: 'no-store' })
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as { decided?: boolean; notice?: string } | null;
        if (!response.ok || !json) throw new Error('consent');
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setNotice(String(json.notice || ''));
        setDecided(Boolean(json.decided));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDecided(true);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adminPath, signedIn, session]);

  async function save(choice: Choice) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || 'Could not save your choice.');
      }
      if (choice === 'all' && pathname && !pathname.startsWith('/admin')) {
        fetch('/api/visitors/hit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathname,
            query: window.location.search,
            referrer: document.referrer,
          }),
          keepalive: true,
        }).catch(() => {});
      }
      setDecided(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your choice.');
    } finally {
      setSaving(false);
    }
  }

  if (hidden) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="container mx-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {settingsOpen ? (
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold">Cookie settings</p>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked disabled className="accent-black" />
              Strictly necessary
            </label>
            <p className="mb-4 text-sm text-gray-800">{notice}</p>
          </div>
        ) : (
          <p className="mb-4 max-w-3xl text-sm text-gray-800">{notice}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {settingsOpen ? (
            <Button helpKey="cookies.save" onClick={() => void save('necessary')} disabled={saving}>
              Save
            </Button>
          ) : (
            <Button helpKey="cookies.allow" onClick={() => void save('all')} disabled={saving}>
              Allow
            </Button>
          )}
          {settingsOpen ? null : (
            <Button helpKey="cookies.reject" variant="secondary" onClick={() => void save('necessary')} disabled={saving}>
              Reject
            </Button>
          )}
          <Button
            helpKey="cookies.settings"
            variant="secondary"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            Cookie settings
          </Button>
          <Button helpKey="cookies.policy" variant="ghost" href="/policies/cookie-policy">
            Cookie policy
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
