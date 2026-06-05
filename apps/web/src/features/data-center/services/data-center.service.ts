import {
  DataCenterDetailSchema,
  DataCenterSchema,
  type DataCenter as ApiDataCenter,
  type DataCenterDetail as ApiDataCenterDetail,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import { toHost } from '@/features/host/services/host.service';
import type { Host } from '@/features/host/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: DataCenterSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: DataCenterDetailSchema,
});

export type DataCenter = ApiDataCenter;

export type DataCenterDetail = ApiDataCenter & {
  hosts: Host[];
};

export type ListDataCentersParams = {
  page: number;
  pageSize: number;
  q?: string;
};
export type ListDataCentersResult = { items: DataCenter[]; total: number };

export async function listDataCenters(
  params: ListDataCentersParams,
): Promise<ListDataCentersResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/data-center?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data,
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function getDataCenter(id: number): Promise<DataCenterDetail> {
  const raw = await apiFetch<unknown>(`/data-center/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  return toDetail(parsed.data);
}

function toDetail(dc: ApiDataCenterDetail): DataCenterDetail {
  return {
    ...dc,
    hosts: dc.hosts.map(toHost),
  };
}
