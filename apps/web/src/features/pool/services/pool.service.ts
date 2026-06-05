import {
  PoolSchema,
  PoolDetailSchema,
  type Pool,
  type CreatePoolBody,
  type UpdatePoolBody,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import { toHost } from '@/features/host/services/host.service';
import type { PoolDetailFE } from '@/features/pool/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: PoolSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: PoolDetailSchema,
});

const MutateResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: PoolSchema,
});

export type { PoolDetailFE };

export type ListPoolsParams = { page: number; pageSize: number; q?: string };
export type ListPoolsResult = { items: Pool[]; total: number };

export async function listPools(
  params: ListPoolsParams,
): Promise<ListPoolsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/pool?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return { items: parsed.data, total: Number.isFinite(total) ? total : 0 };
}

export async function getPool(id: number): Promise<PoolDetailFE> {
  const raw = await apiFetch<unknown>(`/pool/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  return { ...parsed.data, hosts: parsed.data.hosts.map(toHost) };
}

export async function createPool(body: CreatePoolBody): Promise<Pool> {
  const raw = await apiFetch<unknown>('/pool', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return MutateResponseSchema.parse(raw).data;
}

export async function updatePool(
  id: number,
  body: UpdatePoolBody,
): Promise<Pool> {
  const raw = await apiFetch<unknown>(`/pool/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return MutateResponseSchema.parse(raw).data;
}

export async function deletePool(id: number): Promise<void> {
  await apiFetch<unknown>(`/pool/${id}`, { method: 'DELETE' });
}

export async function addHostToPool(
  poolId: number,
  hostId: number,
): Promise<void> {
  await apiFetch<unknown>(`/pool/${poolId}/hosts/${hostId}`, {
    method: 'POST',
  });
}

export async function removeHostFromPool(
  poolId: number,
  hostId: number,
): Promise<void> {
  await apiFetch<unknown>(`/pool/${poolId}/hosts/${hostId}`, {
    method: 'DELETE',
  });
}
