'use client';

import { useEffect, useState } from 'react';
import { defaultPagesForRole, isAdminRole, uniquePageKeys, type AdminPageKey, type AdminRole } from '@shared/admin-roles';

export type AdminMe = {
  username: string;
  role: AdminRole;
  pages: AdminPageKey[];
};

export type AdminMeSession = 'unknown' | 'ok' | 'unauthorized' | 'unreachable';

type FetchResult = { me: AdminMe | null; session: Exclude<AdminMeSession, 'unknown'> };

let inflight: Promise<FetchResult> | null = null;
let cached: { result: FetchResult; at: number } | null = null;
const TTL_MS = 15_000;

export function invalidateAdminMe() {
  cached = null;
  inflight = null;
}

async function fetchAdminMe(): Promise<FetchResult> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.result;
  if (inflight) return inflight;
  inflight = fetch('/api/admin/me', { cache: 'no-store' })
    .then(async (response): Promise<FetchResult> => {
      if (response.status === 401) return { me: null, session: 'unauthorized' };
      if (!response.ok) return { me: null, session: 'unreachable' };
      const json = (await response.json().catch(() => null)) as Partial<AdminMe> | null;
      if (!json?.username || !isAdminRole(json.role)) return { me: null, session: 'unauthorized' };
      const pages = uniquePageKeys(json.pages);
      return {
        me: {
          username: json.username,
          role: json.role,
          pages: pages.length ? pages : defaultPagesForRole(json.role),
        },
        session: 'ok',
      };
    })
    .catch((): FetchResult => ({ me: null, session: 'unreachable' }))
    .then((result) => {
      cached = { result, at: Date.now() };
      return result;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useAdminMe() {
  const [me, setMe] = useState<AdminMe | null>(cached?.result.me ?? null);
  const [session, setSession] = useState<AdminMeSession>(cached ? cached.result.session : 'unknown');
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    fetchAdminMe().then((value) => {
      if (!cancelled) {
        setMe(value.me);
        setSession(value.session);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { me, loading, session };
}
