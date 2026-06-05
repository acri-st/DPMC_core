import { z } from 'zod';
import {
  ProjectSchema,
  type Project,
  type CreateProjectBody,
  type UpdateProjectBody,
} from '@dpmc/client';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProjectSchema.array(),
});

const SingleResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProjectSchema,
});

export type ListProjectsParams = {
  page: number;
  pageSize: number;
  q?: string;
  isActive?: boolean;
  isDefault?: boolean;
};
export type ListProjectsResult = { items: Project[]; total: number };

export async function listProjects(
  params: ListProjectsParams,
): Promise<ListProjectsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.isActive !== undefined)
    search.set('isActive', String(params.isActive));
  if (params.isDefault !== undefined)
    search.set('isDefault', String(params.isDefault));
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/project?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data,
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function getProject(id: number): Promise<Project> {
  const raw = await apiFetch<unknown>(`/project/${id}`);
  return SingleResponseSchema.parse(raw).data;
}

export async function createProject(body: CreateProjectBody): Promise<Project> {
  const raw = await apiFetch<unknown>('/project', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return SingleResponseSchema.parse(raw).data;
}

export async function updateProject(
  id: number,
  body: UpdateProjectBody,
): Promise<Project> {
  const raw = await apiFetch<unknown>(`/project/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return SingleResponseSchema.parse(raw).data;
}

export async function setDefaultProject(id: number): Promise<Project> {
  const raw = await apiFetch<unknown>(`/project/${id}/set-default`, {
    method: 'POST',
  });
  return SingleResponseSchema.parse(raw).data;
}

export async function deleteProject(id: number): Promise<void> {
  await apiFetch<unknown>(`/project/${id}`, { method: 'DELETE' });
}
