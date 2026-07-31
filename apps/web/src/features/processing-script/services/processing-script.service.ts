import {
  ProcessingScriptListItemSchema,
  ProcessingScriptDetailSchema,
  type ProcessingScriptListItem,
  type ProcessingScriptDetail,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessingScriptListItemSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessingScriptDetailSchema,
});

export type ListProcessingScriptsParams = {
  page: number;
  pageSize: number;
  q?: string;
};

export type ListProcessingScriptsResult = {
  items: ProcessingScriptListItem[];
  total: number;
};

export async function listProcessingScripts(
  params: ListProcessingScriptsParams,
): Promise<ListProcessingScriptsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/processing-script?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return { items: parsed.data, total: Number.isFinite(total) ? total : 0 };
}

export async function getProcessingScript(
  id: number,
): Promise<ProcessingScriptDetail> {
  const raw = await apiFetch<unknown>(`/processing-script/${id}`);
  return GetResponseSchema.parse(raw).data;
}
