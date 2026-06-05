import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { listBatches } from '@/features/batch/services/batch.service';
import { listTasks } from '@/features/task/services/task.service';
import { listHosts } from '@/features/host/services/host.service';
import type { Batch } from '@/features/batch/types';
import type { Task } from '@/features/task/types';
import type { Host } from '@/features/host/types';

const POLL_MS = 10_000;
const OVERVIEW_PARAMS = { page: 1, pageSize: 100 } as const;

export function useOverviewData() {
  const { status } = useCurrentUser();
  const enabled = status === 'authenticated';

  const batches = useQuery({
    queryKey: ['overview', 'batches'],
    queryFn: () => listBatches(OVERVIEW_PARAMS),
    enabled,
    refetchInterval: POLL_MS,
  });
  const tasks = useQuery({
    queryKey: ['overview', 'tasks'],
    queryFn: () => listTasks(OVERVIEW_PARAMS),
    enabled,
    refetchInterval: POLL_MS,
  });
  const hosts = useQuery({
    queryKey: ['overview', 'hosts'],
    queryFn: () => listHosts(OVERVIEW_PARAMS),
    enabled,
    refetchInterval: POLL_MS,
  });

  const stats = useMemo(
    () =>
      computeStats({
        batches: batches.data?.items,
        tasks: tasks.data?.items,
        hosts: hosts.data?.items,
      }),
    [batches.data, tasks.data, hosts.data],
  );

  return {
    batches,
    tasks,
    hosts,
    stats,
    isLoading: batches.isLoading || tasks.isLoading || hosts.isLoading,
    isError: batches.isError || tasks.isError || hosts.isError,
  };
}

export type OverviewStats = {
  batchesRunning: number;
  tasksRunning: number;
  hostsUp: number;
  hostsTotal: number;
  co2Last24hGrams: number;
  recentBatches: Batch[];
  recentTasks: Task[];
  recentFailures: Task[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function computeStats(input: {
  batches: Batch[] | undefined;
  tasks: Task[] | undefined;
  hosts: Host[] | undefined;
}): OverviewStats {
  const batches = input.batches ?? [];
  const tasks = input.tasks ?? [];
  const hosts = input.hosts ?? [];

  const now = Date.now();
  const since = now - DAY_MS;

  const batchesRunning = batches.filter((b) => b.status === 'Running').length;
  const tasksRunning = tasks.filter((t) => t.status === 'Running').length;
  const hostsUp = hosts.filter((h) => h.status === 'Up').length;
  const hostsTotal = hosts.length;

  const co2Last24hGrams = batches.reduce((acc, b) => {
    if (b.co2Grams === null || b.co2Grams === undefined) return acc;
    if (!b.startedAt) return acc;
    const startedMs = new Date(b.startedAt).getTime();
    if (!Number.isFinite(startedMs) || startedMs < since) return acc;
    return acc + b.co2Grams;
  }, 0);

  const recentBatches = [...batches]
    .filter((b) => b.startedAt !== null)
    .sort((a, b) => {
      const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  const recentTasks = [...tasks]
    .filter((t) => t.startedAt !== null)
    .sort((a, b) => {
      const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  const recentFailures = [...tasks]
    .filter((t) => t.status === 'Error')
    .sort((a, b) => {
      const ta = a.completedAt
        ? new Date(a.completedAt).getTime()
        : a.updatedAt
          ? new Date(a.updatedAt).getTime()
          : 0;
      const tb = b.completedAt
        ? new Date(b.completedAt).getTime()
        : b.updatedAt
          ? new Date(b.updatedAt).getTime()
          : 0;
      return tb - ta;
    })
    .slice(0, 5);

  return {
    batchesRunning,
    tasksRunning,
    hostsUp,
    hostsTotal,
    co2Last24hGrams,
    recentBatches,
    recentTasks,
    recentFailures,
  };
}
