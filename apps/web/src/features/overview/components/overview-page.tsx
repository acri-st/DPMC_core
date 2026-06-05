import { useMemo } from 'react';
import { AlertCircleIcon, LayoutDashboardIcon } from 'lucide-react';

import { PageHeader } from '@/shared/components/page-header';
import { useProductionChainList } from '@/features/production-chain/hooks/use-production-chain-list';
import { useOverviewData } from '@/features/overview/hooks/use-overview-data';
import { KpiCards } from '@/features/overview/components/kpi-cards';
import { RecentBatches } from '@/features/overview/components/recent-batches';
import { RecentTasks } from '@/features/overview/components/recent-tasks';
import { FailuresFeed } from '@/features/overview/components/failures-feed';
import { ThroughputChart } from '@/features/overview/components/throughput-chart';

export function OverviewPage() {
  const { stats, isLoading, isError, batches, tasks, hosts } =
    useOverviewData();
  const { data: chainsResult } = useProductionChainList();

  const chainNameById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of chainsResult?.items ?? []) {
      map[c.id] = c.name;
    }
    return map;
  }, [chainsResult]);

  void hosts;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={LayoutDashboardIcon}
        title="Overview"
        subtitle="Live snapshot of the orchestrator. Refreshes every 10 seconds."
      />

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>
            One or more dashboard sections failed to load. Try refreshing.
          </span>
        </div>
      ) : null}

      <KpiCards stats={stats} />

      <ThroughputChart
        tasks={tasks.data?.items ?? []}
        isLoading={tasks.isLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentBatches
          batches={stats.recentBatches}
          chainNameById={chainNameById}
          isLoading={batches.isLoading}
        />
        <RecentTasks tasks={stats.recentTasks} isLoading={tasks.isLoading} />
      </div>

      <FailuresFeed
        failures={stats.recentFailures}
        isLoading={tasks.isLoading}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-xs">Loading…</p>
      ) : null}
    </div>
  );
}
