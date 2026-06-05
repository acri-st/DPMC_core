import {
  CreateDatasetBodySchema,
  DatasetSchema,
  type CreateDatasetBody,
  type Dataset,
  type UpdateDatasetBody,
  UpdateDatasetBodySchema,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: DatasetSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: DatasetSchema,
});

export type ListDatasetsParams = {
  page?: number;
  pageSize?: number;
  producedByBatchId?: number;
  name?: string;
};

export type ListDatasetsResult = {
  items: Dataset[];
  total: number;
};

export async function listDatasets(
  params: ListDatasetsParams = {},
): Promise<ListDatasetsResult> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.producedByBatchId) {
    search.set('producedByBatchId', String(params.producedByBatchId));
  }
  if (params.name) search.set('name', params.name);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/dataset?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return { items: parsed.data, total: Number.isFinite(total) ? total : 0 };
}

export async function getDataset(id: number): Promise<Dataset> {
  const raw = await apiFetch<unknown>(`/dataset/${id}`);
  return GetResponseSchema.parse(raw).data;
}

export async function createDataset(body: CreateDatasetBody): Promise<Dataset> {
  CreateDatasetBodySchema.parse(body);
  const raw = await apiFetch<unknown>('/dataset', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return GetResponseSchema.parse(raw).data;
}

export async function updateDataset(
  id: number,
  body: UpdateDatasetBody,
): Promise<Dataset> {
  UpdateDatasetBodySchema.parse(body);
  const raw = await apiFetch<unknown>(`/dataset/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return GetResponseSchema.parse(raw).data;
}

export async function deleteDataset(id: number): Promise<void> {
  await apiFetch<unknown>(`/dataset/${id}`, { method: 'DELETE' });
}
