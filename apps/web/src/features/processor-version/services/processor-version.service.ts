import {
  AuxiliaryConfigurationSchema,
  CreateAuxiliaryConfigurationBodySchema,
  CreateProcessorVersionBodySchema,
  ProcessingScriptSchema,
  ProcessingScriptVersionSchema,
  ProcessorVersionSchema,
  type AuxiliaryConfiguration,
  type CreateAuxiliaryConfigurationBody,
  type CreateProcessorVersionBody,
  type ProcessingScript,
  type ProcessingScriptVersion,
  type ProcessorVersion as ApiProcessorVersion,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import type { ProcessorVersion } from '@/features/processor-version/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessorVersionSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessorVersionSchema,
});

const ScriptsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessingScriptSchema.array(),
});

const AuxConfigListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: AuxiliaryConfigurationSchema.array(),
});

const AuxConfigGetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: AuxiliaryConfigurationSchema,
});

export type ListProcessorVersionsParams = {
  page: number;
  pageSize: number;
  q?: string;
};
export type ListProcessorVersionsResult = {
  items: ProcessorVersion[];
  total: number;
};

export async function listProcessorVersions(
  params: ListProcessorVersionsParams,
): Promise<ListProcessorVersionsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/processor-version?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toProcessorVersion),
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function createProcessorVersion(
  body: CreateProcessorVersionBody,
): Promise<ProcessorVersion> {
  CreateProcessorVersionBodySchema.parse(body);
  const raw = await apiFetch<unknown>('/processor-version', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const parsed = GetResponseSchema.parse(raw);
  return toProcessorVersion(parsed.data);
}

export async function listProcessingScripts(): Promise<ProcessingScript[]> {
  const raw = await apiFetch<unknown>('/processing-script?page=1&pageSize=500');
  const parsed = ScriptsResponseSchema.parse(raw);
  return parsed.data;
}

export async function listProcessingScriptVersions(
  scriptId: string,
): Promise<ProcessingScriptVersion[]> {
  // Falls back to OData filter if no nested REST endpoint exists
  const raw = await apiFetch<unknown>(
    `/odata/processing-script-version?$filter=processingScriptId eq '${scriptId}'`,
  ).catch(() => null);
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const arr = (raw as { value: unknown }).value;
    return ProcessingScriptVersionSchema.array().parse(arr);
  }
  // Fallback: list everything via processing-script/:id sub-resource if available
  const fallback = await apiFetch<unknown>(`/processing-script/${scriptId}`);
  const detail = z
    .object({
      data: z
        .object({ versions: ProcessingScriptVersionSchema.array().optional() })
        .passthrough(),
    })
    .safeParse(fallback);
  return detail.success ? (detail.data.data.versions ?? []) : [];
}

export async function listAuxiliaryConfigurations(): Promise<
  AuxiliaryConfiguration[]
> {
  const raw = await apiFetch<unknown>(
    '/auxiliary-configuration?page=1&pageSize=500',
  );
  const parsed = AuxConfigListResponseSchema.parse(raw);
  return parsed.data;
}

export async function createAuxiliaryConfiguration(
  body: CreateAuxiliaryConfigurationBody,
): Promise<AuxiliaryConfiguration> {
  CreateAuxiliaryConfigurationBodySchema.parse(body);
  const raw = await apiFetch<unknown>('/auxiliary-configuration', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const parsed = AuxConfigGetResponseSchema.parse(raw);
  return parsed.data;
}

function toProcessorVersion(p: ApiProcessorVersion): ProcessorVersion {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
  };
}
