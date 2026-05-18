import { API_BASE } from './config';

type FetchOptions = RequestInit & { token?: string | null };

function formatApiError(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const maybeMessage = 'message' in body && typeof body.message === 'string' ? body.message : null;
  const maybeErrors = 'errors' in body && typeof body.errors === 'object' && body.errors ? body.errors : null;

  if (!maybeErrors) {
    return maybeMessage ?? fallback;
  }

  const details = Object.values(maybeErrors)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === 'string');

  if (!details.length) {
    return maybeMessage ?? fallback;
  }

  return maybeMessage ? `${maybeMessage}: ${details.join(' ')}` : details.join(' ');
}

function buildHeaders(token?: string | null): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: extra, ...init } = options;
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: { ...buildHeaders(token), ...extra },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = formatApiError(body, detail);
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
