import {
  CreateTaskScheduleBodySchema,
  TaskScheduleSchema,
  type CreateTaskScheduleBody,
  type TaskSchedule as ApiTaskSchedule,
  type UpdateTaskScheduleBody,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch } from '@/shared/libs/api-client';

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

export async function listSchedules(): Promise<Schedule[]> {
  const raw = await apiFetch<unknown>('/task-schedule');
  return ListResponseSchema.parse(raw).data;
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
