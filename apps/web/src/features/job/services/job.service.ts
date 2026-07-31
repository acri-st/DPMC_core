import { JobSchema, type Job as ApiJob, type JobStatus } from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import type { Job } from '@/features/job/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: JobSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: JobSchema,
});

export type SortOrder = 'asc' | 'desc';

export type ListJobsParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: JobStatus;
  sort?: string;
  order?: SortOrder;
};

export type ListJobsResult = {
  items: Job[];
  total: number;
};

export async function listJobs(
  params: ListJobsParams,
): Promise<ListJobsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.sort) {
    search.set('sort', params.sort);
    search.set('order', params.order ?? 'desc');
  }
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/job?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toJob),
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function getJob(id: number): Promise<Job> {
  const raw = await apiFetch<unknown>(`/job/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  return toJob(parsed.data);
}

function toJob(job: ApiJob): Job {
  return {
    ...job,
    dataVolume: toNumberOrNull(job.dataVolume),
    expectedStartTime: job.expectedStartTime
      ? job.expectedStartTime.toISOString()
      : null,
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    endedAt: job.endedAt ? job.endedAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function toNumberOrNull(value: number | bigint | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  return Number(value);
}
