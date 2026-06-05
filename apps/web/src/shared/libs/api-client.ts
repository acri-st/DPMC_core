const API_BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api'
).replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetchWithMeta<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; headers: Headers }> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (response.status === 204) {
    return { data: undefined as T, headers: response.headers };
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(body) ??
        `Request to ${url} failed with status ${response.status}`,
      body,
    );
  }

  return { data: body as T, headers: response.headers };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await apiFetchWithMeta<T>(path, init);
  return data;
}

/**
 * Pull a human-readable error message out of whatever shape the API
 * returned. Tries, in order: `{error: {message}}` (current shape with the
 * `error` wrapper), `{error: 'string'}` (legacy / Nest default), top-level
 * `{message: string | string[]}` (Nest validation pipe).
 */
function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return typeof body === 'string' && body.length > 0 ? body : null;
  }
  const o = body as Record<string, unknown>;
  if (typeof o.error === 'object' && o.error !== null) {
    const m = (o.error as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m))
      return m.filter((x) => typeof x === 'string').join('; ');
  }
  if (typeof o.error === 'string' && o.error.length > 0) return o.error;
  if (typeof o.message === 'string') return o.message;
  if (Array.isArray(o.message))
    return o.message.filter((x) => typeof x === 'string').join('; ');
  return null;
}
