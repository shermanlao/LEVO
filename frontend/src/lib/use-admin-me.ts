'use client';

import { useEffect, useState } from 'react';
import { defaultPagesForRole, isAdminRole, uniquePageKeys, type AdminPageKey, type AdminRole } from '@shared/admin-roles';

export type AdminMe = {
  username: string;
  role: AdminRole;
  pages: AdminPageKey[];
};

let inflight: Promise<AdminMe | null> | null = null;
let cached: { me: AdminMe | null; at: number } | null = null;
const TTL_MS = 15_000;

export function invalidateAdminMe() {
  cached = null;
  inflight = null;
}

async function fetchAdminMe(): Promise<AdminMe | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.me;
  if (inflight) return inflight;
  inflight = fetch('/api/admin/me', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) return null;
      const json = (await response.json().catch(() => null)) as Partial<AdminMe> | null;
      if (!json?.username || !isAdminRole(json.role)) return null;
      const pages = uniquePageKeys(json.pages);
      const me: AdminMe = {
        username: json.username,
        role: json.role,
        pages: pages.length ? pages : defaultPagesForRole(json.role),
      };
      return me;
    })
    .catch(() => null)
    .then((me) => {
      cached = { me, at: Date.now() };
      return me;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useAdminMe() {
  const [me, setMe] = useState<AdminMe | null>(cached?.me ?? null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    fetchAdminMe().then((value) => {
      if (!cancelled) {
        setMe(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { me, loading };
}
