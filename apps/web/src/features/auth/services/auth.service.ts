import { CurrentUserSchema, type CurrentUser } from '@dpmc/client';
import { z } from 'zod';

import { ApiError, apiFetch } from '@/shared/libs/api-client';

const MeResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: CurrentUserSchema,
});

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const raw = await apiFetch<unknown>('/auth/me');
    const parsed = MeResponseSchema.parse(raw);
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function getLoginUrl(returnTo?: string): string {
  const base = (
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
  ).replace(/\/$/, '');
  const path = `${base}/auth/login`;
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
