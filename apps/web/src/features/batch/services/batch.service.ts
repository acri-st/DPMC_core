import {
  BatchInputEntrySchema,
  BatchJobSchema,
  BatchProductWithPreviewSchema,
  BatchSchema,
  type Batch as ApiBatch,
  type BatchInputEntry,
  type BatchJob as ApiBatchJob,
  type BatchKind,
  type BatchProductWithPreview,
  type BatchStatus,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import type { Batch } from '@/features/batch/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: BatchSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: BatchSchema,
});

const ReplayResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: BatchSchema,
});

export type ListBatchesParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: BatchStatus;
  kind?: BatchKind;
};

export type ListBatchesResult = {
  items: Batch[];
  total: number;
};

export async function listBatches(
  params: ListBatchesParams,
): Promise<ListBatchesResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.kind) search.set('kind', params.kind);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/batch?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toBatch),
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function getBatch(id: number): Promise<Batch> {
  const raw = await apiFetch<unknown>(`/batch/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  return toBatch(parsed.data);
}

export async function replayBatch(id: number): Promise<Batch> {
  const raw = await apiFetch<unknown>(`/batch/${id}/replay`, {
    method: 'POST',
  });
  const parsed = ReplayResponseSchema.parse(raw);
  return toBatch(parsed.data);
}

const ListJobsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: BatchJobSchema.array(),
});

export type BatchJobView = Omit<ApiBatchJob, 'startedAt' | 'endedAt'> & {
  startedAt: string | null;
  endedAt: string | null;
};

export async function listBatchJobs(id: number): Promise<BatchJobView[]> {
  const raw = await apiFetch<unknown>(`/batch/${id}/jobs`);
  const parsed = ListJobsResponseSchema.parse(raw);
  return parsed.data.map((j) => ({
    ...j,
    startedAt: j.startedAt ? j.startedAt.toISOString() : null,
    endedAt: j.endedAt ? j.endedAt.toISOString() : null,
  }));
}

const ListProductsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: BatchProductWithPreviewSchema.array(),
});

export type ProductView = Omit<
  BatchProductWithPreview,
  'generatedAt' | 'createdAt'
> & {
  generatedAt: string | null;
  createdAt: string;
};

export async function listBatchProducts(id: number): Promise<ProductView[]> {
  const raw = await apiFetch<unknown>(`/batch/${id}/products`);
  const parsed = ListProductsResponseSchema.parse(raw);
  return parsed.data.map((p) => ({
    ...p,
    generatedAt: p.generatedAt ? p.generatedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));
}

const ListInputsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: BatchInputEntrySchema.array(),
});

export type InputView = BatchInputEntry;

export async function listBatchInputs(id: number): Promise<InputView[]> {
  const raw = await apiFetch<unknown>(`/batch/${id}/inputs`);
  const parsed = ListInputsResponseSchema.parse(raw);
  return parsed.data;
}

const ListLogsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: z.object({
    logs: z.array(
      z.object({
        id: z.number(),
        hostId: z.number(),
        jobId: z.number().nullable().optional(),
        level: z.enum(['Debug', 'Info', 'Warning', 'Error', 'Critical']),
        message: z.string(),
        loggedAt: z.coerce.date(),
        createdAt: z.coerce.date(),
      }),
    ),
    nextBefore: z.coerce.date().nullable(),
  }),
});

export type BatchLogEntry = {
  id: number;
  hostId: number;
  jobId: number | null;
  level: 'Debug' | 'Info' | 'Warning' | 'Error' | 'Critical';
  message: string;
  loggedAt: string;
};

export type ListBatchLogsResult = {
  logs: BatchLogEntry[];
  nextBefore: string | null;
};

export async function listBatchLogs(
  id: number,
  opts: { limit?: number; before?: Date; level?: BatchLogEntry['level'] } = {},
): Promise<ListBatchLogsResult> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before.toISOString());
  if (opts.level) params.set('level', opts.level);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const raw = await apiFetch<unknown>(`/batch/${id}/logs${suffix}`);
  const parsed = ListLogsResponseSchema.parse(raw);
  return {
    logs: parsed.data.logs.map((l) => ({
      id: l.id,
      hostId: l.hostId,
      jobId: l.jobId ?? null,
      level: l.level,
      message: l.message,
      loggedAt: l.loggedAt.toISOString(),
    })),
    nextBefore: parsed.data.nextBefore
      ? parsed.data.nextBefore.toISOString()
      : null,
  };
}

function toBatch(batch: ApiBatch): Batch {
  return {
    ...batch,
    scheduledAt: batch.scheduledAt ? batch.scheduledAt.toISOString() : null,
    startedAt: batch.startedAt ? batch.startedAt.toISOString() : null,
    endedAt: batch.endedAt ? batch.endedAt.toISOString() : null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}
