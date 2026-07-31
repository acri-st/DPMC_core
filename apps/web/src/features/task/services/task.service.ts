import {
  CreateTaskBodySchema,
  TaskBatchEntrySchema,
  TaskSchema,
  type TaskBatchEntry as ApiTaskBatchEntry,
  type CreateTaskBody,
  type Task as ApiTask,
  type TaskKind,
  type TaskStatus,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import type { Batch } from '@/features/batch/types';
import type { Task } from '@/features/task/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: TaskSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: TaskSchema,
});

export type SortOrder = 'asc' | 'desc';

export type ListTasksParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: TaskStatus[];
  kind?: TaskKind[];
  sort?: string;
  order?: SortOrder;
};

export type ListTasksResult = {
  items: Task[];
  total: number;
};

export async function listTasks(
  params: ListTasksParams,
): Promise<ListTasksResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  for (const s of params.status ?? []) search.append('status', s);
  for (const k of params.kind ?? []) search.append('kind', k);
  if (params.sort) {
    search.set('sort', params.sort);
    search.set('order', params.order ?? 'desc');
  }
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/task?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toTask),
    total: Number.isFinite(total) ? total : 0,
  };
}

const TaskStatusSummarySchema = z.object({
  Edited: z.number(),
  Queued: z.number(),
  Running: z.number(),
  Done: z.number(),
  Error: z.number(),
  Suspended: z.number(),
});
export type TaskStatusSummary = z.infer<typeof TaskStatusSummarySchema>;

export async function getTaskStatusSummary(): Promise<TaskStatusSummary> {
  const raw = await apiFetch<unknown>('/task/status-summary');
  return TaskStatusSummarySchema.parse(
    z.object({ data: TaskStatusSummarySchema }).parse(raw).data,
  );
}

export async function getTask(id: number): Promise<Task> {
  const raw = await apiFetch<unknown>(`/task/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  return toTask(parsed.data);
}

export async function createTask(body: CreateTaskBody): Promise<Task> {
  CreateTaskBodySchema.parse(body);
  const raw = await apiFetch<unknown>('/task', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const parsed = GetResponseSchema.parse(raw);
  return toTask(parsed.data);
}

export async function deleteTask(id: number): Promise<void> {
  await apiFetch<unknown>(`/task/${id}`, { method: 'DELETE' });
}

export async function triggerTask(id: number): Promise<Task> {
  const raw = await apiFetch<unknown>(`/task/${id}/trigger`, {
    method: 'POST',
  });
  const parsed = GetResponseSchema.parse(raw);
  return toTask(parsed.data);
}

const BatchesResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: TaskBatchEntrySchema.array(),
});

export type TaskBatch = Batch & {
  scripts: Array<{ acronym: string; name: string }>;
  hosts: Array<{ id: number; hostname: string }>;
};

export async function getTaskBatches(id: number): Promise<TaskBatch[]> {
  const raw = await apiFetch<unknown>(`/task/${id}/batches`);
  const parsed = BatchesResponseSchema.parse(raw);
  return parsed.data.map(toTaskBatch);
}

function toTaskBatch(entry: ApiTaskBatchEntry): TaskBatch {
  const { scripts, hosts, ...batch } = entry;
  return {
    ...batch,
    scheduledAt: batch.scheduledAt ? batch.scheduledAt.toISOString() : null,
    startedAt: batch.startedAt ? batch.startedAt.toISOString() : null,
    endedAt: batch.endedAt ? batch.endedAt.toISOString() : null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    scripts,
    hosts,
  };
}

function toTask(task: ApiTask): Task {
  return {
    ...task,
    scheduledStartTime: task.scheduledStartTime.toISOString(),
    expectedStartTime: task.expectedStartTime
      ? task.expectedStartTime.toISOString()
      : null,
    startedAt: task.startedAt ? task.startedAt.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt ? task.deletedAt.toISOString() : null,
  };
}
