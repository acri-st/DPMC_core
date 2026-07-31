import {
  CreateTaskScheduleBodySchema,
  TaskScheduleSchema,
  type CreateTaskScheduleBody,
  type TaskKind,
  type TaskSchedule as ApiTaskSchedule,
  type UpdateTaskScheduleBody,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: TaskScheduleSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: TaskScheduleSchema,
});

export type Schedule = ApiTaskSchedule;

export type SortOrder = 'asc' | 'desc';

export type ListSchedulesParams = {
  page: number;
  pageSize: number;
  q?: string;
  kind?: TaskKind[];
  enabled?: boolean;
  sort?: string;
  order?: SortOrder;
};

export type ListSchedulesResult = { items: Schedule[]; total: number };

export async function listSchedules(
  params: ListSchedulesParams,
): Promise<ListSchedulesResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  for (const k of params.kind ?? []) search.append('kind', k);
  if (params.enabled !== undefined)
    search.set('enabled', String(params.enabled));
  if (params.sort) {
    search.set('sort', params.sort);
    search.set('order', params.order ?? 'desc');
  }
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/task-schedule?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return { items: parsed.data, total: Number.isFinite(total) ? total : 0 };
}

export async function getSchedule(id: number): Promise<Schedule> {
  const raw = await apiFetch<unknown>(`/task-schedule/${id}`);
  return GetResponseSchema.parse(raw).data;
}

export async function createSchedule(
  body: CreateTaskScheduleBody,
): Promise<Schedule> {
  CreateTaskScheduleBodySchema.parse(body);
  const raw = await apiFetch<unknown>('/task-schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return GetResponseSchema.parse(raw).data;
}

export async function updateSchedule(
  id: number,
  body: UpdateTaskScheduleBody,
): Promise<Schedule> {
  const raw = await apiFetch<unknown>(`/task-schedule/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return GetResponseSchema.parse(raw).data;
}

export async function deleteSchedule(id: number): Promise<void> {
  await apiFetch<unknown>(`/task-schedule/${id}`, { method: 'DELETE' });
}
