import { HostLogSchema, type HostLog as ApiHostLog } from '@dpmc/client';
import { z } from 'zod';

import { apiFetch } from '@/shared/libs/api-client';

const ListLogsResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: z.object({
    logs: HostLogSchema.array(),
    nextBefore: z.coerce.date().nullable(),
  }),
});

export type HostLogEntry = {
  id: number;
  hostId: number;
  level: ApiHostLog['level'];
  message: string;
  loggedAt: string;
  createdAt: string;
};

export type ListHostLogsResult = {
  logs: HostLogEntry[];
  /** ISO date to pass as `before` to fetch the next (older) page, or null. */
  nextBefore: string | null;
};

export async function listHostLogs(
  id: number,
  opts: { limit?: number; before?: string | null } = {},
): Promise<ListHostLogsResult> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 100));
  if (opts.before) params.set('before', opts.before);

  const raw = await apiFetch<unknown>(`/host/${id}/logs?${params.toString()}`);
  const parsed = ListLogsResponseSchema.parse(raw);
  return {
    logs: parsed.data.logs.map(toHostLogEntry),
    nextBefore: parsed.data.nextBefore
      ? parsed.data.nextBefore.toISOString()
      : null,
  };
}

export function toHostLogEntry(log: ApiHostLog): HostLogEntry {
  return {
    id: log.id,
    hostId: log.hostId,
    level: log.level,
    message: log.message,
    loggedAt: log.loggedAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}
