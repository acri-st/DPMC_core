import { AppUserSchema, type AppUser as ApiAppUser } from '@dpmc/client';
import { z } from 'zod';

import { apiFetchWithMeta } from '@/shared/libs/api-client';
import type { AppUser } from '@/features/user/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: AppUserSchema.array(),
});

export type ListUsersParams = { page: number; pageSize: number; q?: string };
export type ListUsersResult = { items: AppUser[]; total: number };

export async function listUsers(
  params: ListUsersParams,
): Promise<ListUsersResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/user?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toAppUser),
    total: Number.isFinite(total) ? total : 0,
  };
}

function toAppUser(u: ApiAppUser): AppUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    roles: [],
    lastLoginAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : '',
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
