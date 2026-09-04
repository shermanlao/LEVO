import { ADMIN_BACKEND_BASE } from '@/lib/api-config';

export type AdminFetchOk<T> = { ok: true; data: T; status: number };
export type AdminFetchErr = { ok: false; error: string; status: number };
export type AdminFetchResult<T> = AdminFetchOk<T> | AdminFetchErr;

function adminUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${ADMIN_BACKEND_BASE}${suffix}`;
}

export async function readErrorMessage(response: Response, fallback?: string): Promise<string> {
  const json = await response.json().catch(() => ({} as { error?: string; message?: string }));
  return String(json?.error || json?.message || fallback || `Request failed (${response.status})`);
}

export async function adminFetchJson<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<AdminFetchResult<T>> {
  try {
    const response = await fetch(adminUrl(path), {
      cache: 'no-store',
      ...init,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error =
        (json as { error?: string; message?: string })?.error ||
        (json as { message?: string })?.message ||
        `Request failed (${response.status})`;
      return { ok: false, error: String(error), status: response.status };
    }
    return { ok: true, data: json as T, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

export async function uploadAdminImage(
  file: File,
  extra?: Record<string, string>
): Promise<AdminFetchResult<{ filePath?: string; url?: string; fileName?: string; name?: string }>> {
  const body = new FormData();
  body.append('files', file);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value != null) body.append(key, value);
    }
  }
  try {
    const response = await fetch(adminUrl('/upload'), {
      method: 'POST',
      body,
      cache: 'no-store',
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: String((json as { error?: string })?.error || `Upload failed (${response.status})`),
        status: response.status,
      };
    }
    const payload = Array.isArray(json) ? json[0] : json;
    return { ok: true, data: payload, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      status: 0,
    };
  }
}
