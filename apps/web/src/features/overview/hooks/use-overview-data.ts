import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listBatches,
  getBatchStatusSummary,
  type BatchStatusSummary,
} from '@/features/batch/services/batch.service';
import {
  listTasks,
  getTaskStatusSummary,
  type TaskStatusSummary,
} from '@/features/task/services/task.service';
import { listHosts } from '@/features/host/services/host.service';
import type { Co2Concern } from '@dpmc/client';
import type { Batch } from '@/features/batch/types';
import type { Task } from '@/features/task/types';
import type { Host } from '@/features/host/types';

const POLL_MS = 10_000;
const OVERVIEW_PARAMS = { page: 1, pageSize: 100 } as const;

// The 24h throughput chart needs tasks that ENDED recently, not the newest
// created — so we fetch terminal tasks ordered by completedAt desc (a big page
// covers a busy 24h) rather than reusing the createdAt-desc overview page, which
// a burst of freshly-created Queued tasks would otherwise fill, hiding real
// completions. Status can't be OR-filtered server-side, hence two queries.
const THROUGHPUT_POLL_MS = 60_000;
const THROUGHPUT_PARAMS = {
  page: 1,
  pageSize: 500,
  sort: 'completedAt',
  order: 'desc',
} as const;

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
  const throughputDone = useQuery({
    queryKey: ['overview', 'throughput', 'Done'],
    queryFn: () => listTasks({ ...THROUGHPUT_PARAMS, status: ['Done'] }),
    enabled,
    refetchInterval: THROUGHPUT_POLL_MS,
  });
  const throughputError = useQuery({
    queryKey: ['overview', 'throughput', 'Error'],
    queryFn: () => listTasks({ ...THROUGHPUT_PARAMS, status: ['Error'] }),
    enabled,
    refetchInterval: THROUGHPUT_POLL_MS,
  });
  const throughputTasks = useMemo(
    () => [
      ...(throughputDone.data?.items ?? []),
      ...(throughputError.data?.items ?? []),
    ],
    [throughputDone.data, throughputError.data],
  );

  // Project-wide status counts (accurate, computed server-side) for the KPI
  // cards — not derived from the capped overview list pages.
  const taskSummary = useQuery({
    queryKey: ['overview', 'task-summary'],
    queryFn: getTaskStatusSummary,
    enabled,
    refetchInterval: POLL_MS,
  });
  const batchSummary = useQuery({
    queryKey: ['overview', 'batch-summary'],
    queryFn: getBatchStatusSummary,
    enabled,
    refetchInterval: POLL_MS,
  });

  const stats = useMemo(
    () =>
      computeStats({
        batches: batches.data?.items,
        tasks: tasks.data?.items,
        hosts: hosts.data?.items,
        // Recent failures must come from the dedicated Error query (completedAt
        // desc), not the createdAt-desc overview page which a burst of Queued
        // tasks would fill — that's why the feed was always empty.
        errorTasks: throughputError.data?.items,
      }),
    [batches.data, tasks.data, hosts.data, throughputError.data],
  );

  return {
    batches,
    tasks,
    hosts,
    stats,
    throughputTasks,
    throughputLoading: throughputDone.isLoading || throughputError.isLoading,
    taskSummary: taskSummary.data ?? null,
    batchSummary: batchSummary.data ?? null,
    isLoading: batches.isLoading || tasks.isLoading || hosts.isLoading,
    isError: batches.isError || tasks.isError || hosts.isError,
  };
}

export type { TaskStatusSummary, BatchStatusSummary };

const HOST_STATUSES = ['Up', 'Busy', 'Off', 'Maintenance'] as const;
type HostStatusName = (typeof HOST_STATUSES)[number];

export type OverviewStats = {
  batchesRunning: number;
  tasksRunning: number;
  hostsUp: number;
  hostsTotal: number;
  hostsByStatus: Record<HostStatusName, number>;
  co2Last24hGrams: number;
  co2Last24hByConcern: Co2Concern;
  recentBatches: Batch[];
  recentTasks: Task[];
  recentFailures: Task[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function computeStats(input: {
  batches: Batch[] | undefined;
  tasks: Task[] | undefined;
  hosts: Host[] | undefined;
  errorTasks: Task[] | undefined;
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
  const hostsByStatus = HOST_STATUSES.reduce(
    (acc, s) => {
      acc[s] = hosts.filter((h) => h.status === s).length;
      return acc;
    },
    { Up: 0, Busy: 0, Off: 0, Maintenance: 0 } as Record<
      HostStatusName,
      number
    >,
  );

  const startedInWindow = (b: Batch): boolean => {
    if (!b.startedAt) return false;
    const startedMs = new Date(b.startedAt).getTime();
    return Number.isFinite(startedMs) && startedMs >= since;
  };

  const co2Last24hGrams = batches.reduce((acc, b) => {
    if (b.co2Grams === null || b.co2Grams === undefined) return acc;
    if (!startedInWindow(b)) return acc;
    return acc + b.co2Grams;
  }, 0);

  // Same window, split per concern, so the KPI can say where the emissions
  // came from and not only how much there was.
  const co2Last24hByConcern = batches.reduce<Co2Concern>(
    (acc, b) => {
      if (!b.co2GramsByConcern || !startedInWindow(b)) return acc;
      return {
        cpu: acc.cpu + b.co2GramsByConcern.cpu,
        gpu: acc.gpu + b.co2GramsByConcern.gpu,
        ingress: acc.ingress + b.co2GramsByConcern.ingress,
        egress: acc.egress + b.co2GramsByConcern.egress,
      };
    },
    { cpu: 0, gpu: 0, ingress: 0, egress: 0 },
  );

  // "Recent" = most recently created, including not-yet-started (Queued/Edited)
  // items — previously these were filtered out by `startedAt !== null`, so a
  // freshly launched batch/task never showed up here.
  const byCreatedDesc = <T extends { createdAt: string | Date }>(a: T, b: T) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  const recentBatches = [...batches].sort(byCreatedDesc).slice(0, 5);

  const recentTasks = [...tasks].sort(byCreatedDesc).slice(0, 5);

  const failedAtMs = (t: Task) =>
    t.completedAt
      ? new Date(t.completedAt).getTime()
      : t.updatedAt
        ? new Date(t.updatedAt).getTime()
        : 0;
  const recentFailures = [...(input.errorTasks ?? [])]
    .filter((t) => t.status === 'Error')
    .sort((a, b) => failedAtMs(b) - failedAtMs(a))
    .slice(0, 5);

  return {
    batchesRunning,
    tasksRunning,
    hostsUp,
    hostsTotal,
    hostsByStatus,
    co2Last24hGrams,
    co2Last24hByConcern,
    recentBatches,
    recentTasks,
    recentFailures,
  };
}
