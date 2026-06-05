import {
  HostBatchSummarySchema,
  HostMetricsSchema,
  HostSchema,
  type Batch,
  type Host as ApiHost,
  type HostMetrics,
  type HostStatus,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import type { Host } from '@/features/host/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: HostSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: HostSchema,
});

const ListMetricsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: HostMetricsSchema.array(),
});

const ListBatchesResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: HostBatchSummarySchema.array(),
});

export type HostBatchEntry = {
  batch: Batch;
  jobsOnHost: number;
  lastJobEndedAt: string | null;
  lastJobStartedAt: string | null;
};

export type ListHostsParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: HostStatus;
};
export type ListHostsResult = { items: Host[]; total: number };

export async function listHosts(
  params: ListHostsParams,
): Promise<ListHostsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/host?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toHost),
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function getHost(id: number): Promise<Host> {
  const raw = await apiFetch<unknown>(`/host/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  return toHost(parsed.data);
}

export async function listHostMetrics(
  id: number,
  opts: { limit?: number; since?: string } = {},
): Promise<HostMetrics[]> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 60));
  if (opts.since) params.set('since', opts.since);
  const raw = await apiFetch<unknown>(
    `/host/${id}/metrics?${params.toString()}`,
  );
  return ListMetricsResponseSchema.parse(raw).data;
}

export async function listHostBatches(
  id: number,
  opts: { limit?: number } = {},
): Promise<HostBatchEntry[]> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 10));
  const raw = await apiFetch<unknown>(
    `/host/${id}/batches?${params.toString()}`,
  );
  const parsed = ListBatchesResponseSchema.parse(raw);
  return parsed.data.map((row) => ({
    batch: row.batch,
    jobsOnHost: row.jobsOnHost,
    lastJobEndedAt: row.lastJobEndedAt
      ? row.lastJobEndedAt.toISOString()
      : null,
    lastJobStartedAt: row.lastJobStartedAt
      ? row.lastJobStartedAt.toISOString()
      : null,
  }));
}

export function toHost(host: ApiHost): Host {
  return {
    ...host,
    ram: toNumber(host.ram),
    disk: toNumber(host.disk),
    lastHeartbeatAt: host.lastHeartbeatAt
      ? host.lastHeartbeatAt.toISOString()
      : null,
    createdAt: host.createdAt.toISOString(),
    updatedAt: host.updatedAt.toISOString(),
  };
}

function toNumber(value: number | bigint | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
