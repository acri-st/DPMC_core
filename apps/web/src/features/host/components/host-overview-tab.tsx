import { format } from 'date-fns';
import {
  ActivityIcon,
  ClockIcon,
  CpuIcon,
  FolderIcon,
  GaugeIcon,
  HardDriveIcon,
  MemoryStickIcon,
  NetworkIcon,
  ServerCogIcon,
  ZapIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { RelativeTime } from '@/shared/components/relative-time';
import { formatBytes } from '@/shared/libs/format-bytes';
import { cn } from '@/shared/utils';
import type { Host } from '@/features/host/types';
import { useHostMetrics } from '@/features/host/hooks/use-host-metrics';
import { HostRecentBatches } from '@/features/host/components/host-recent-batches';

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

type Props = {
  host: Host;
};

export function HostOverviewTab({ host }: Props) {
  const heartbeatStale =
    host.lastHeartbeatAt &&
    Date.now() - new Date(host.lastHeartbeatAt).getTime() > HEARTBEAT_STALE_MS;

  const metricsQuery = useHostMetrics(host.id, 60);
  // The API returns metrics newest first — we flip them for charts.
  const samples = (metricsQuery.data ?? []).slice().reverse();
  const latest = samples.length > 0 ? samples[samples.length - 1] : null;

  return (
    <div className="flex flex-col gap-4">
      <details className="group rounded-md border" open>
        <summary className="text-muted-foreground hover:bg-muted/40 flex cursor-pointer list-none items-center justify-between px-4 py-2 text-xs">
          <span>Identifiers & timestamps</span>
          <span className="text-[11px] group-open:hidden">show</span>
          <span className="hidden text-[11px] group-open:inline">hide</span>
        </summary>
        <div className="grid grid-cols-1 gap-2 border-t p-4 text-xs sm:grid-cols-2">
          <Field label="Host id">
            <span className="font-mono break-all text-[11px]">{host.id}</span>
          </Field>
          <Field label="Data center id">
            <span className="font-mono break-all text-[11px]">
              {host.dataCenterId}
            </span>
          </Field>
          <Field label="Created">
            {format(new Date(host.createdAt), 'PPpp')}
          </Field>
          <Field label="Updated">
            {format(new Date(host.updatedAt), 'PPpp')}
          </Field>
        </div>
      </details>

      <LiveLoadCard
        host={host}
        latest={latest}
        samples={samples}
        isLoading={metricsQuery.isLoading}
        hasError={metricsQuery.isError}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Specifications</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SpecTile
              icon={<CpuIcon className="size-4" />}
              label="Cores"
              value={`${host.nbCores}`}
            />
            <SpecTile
              icon={<MemoryStickIcon className="size-4" />}
              label="RAM"
              value={formatBytes(host.ram)}
            />
            <SpecTile
              icon={<HardDriveIcon className="size-4" />}
              label="Disk"
              value={formatBytes(host.disk)}
            />
            <SpecTile
              icon={<ZapIcon className="size-4" />}
              label="GPU"
              value={
                host.hasGpu
                  ? `${host.gpuCount}× ${host.gpuModel ?? 'GPU'}`
                  : '—'
              }
              accent={host.hasGpu ? 'purple' : undefined}
            />
            <SpecTile
              icon={<ServerCogIcon className="size-4" />}
              label="Runtime"
              value={host.containerRuntime}
            />
            <SpecTile
              icon={<ServerCogIcon className="size-4" />}
              label="OS"
              value={`${host.osType}`}
              hint={host.osVersion}
            />
            <SpecTile
              icon={<GaugeIcon className="size-4" />}
              label="Priority"
              value={host.schedulingPriority}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field icon={<NetworkIcon className="size-3.5" />} label="IP">
              <span className="font-mono">{host.ipAddress}</span>
            </Field>
            <Field
              icon={<ClockIcon className="size-3.5" />}
              label="Last heartbeat"
              stacked
            >
              {host.lastHeartbeatAt ? (
                <span
                  className={cn(
                    'inline-flex items-baseline gap-1',
                    heartbeatStale && 'font-medium text-rose-600',
                  )}
                >
                  <RelativeTime
                    date={host.lastHeartbeatAt}
                    withTooltip={false}
                  />
                  <span className="text-muted-foreground text-[11px]">
                    ({format(new Date(host.lastHeartbeatAt), 'PPpp')})
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">never</span>
              )}
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filesystem</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            icon={<FolderIcon className="size-3.5" />}
            label="Processing dir"
            stacked
          >
            <span className="font-mono text-xs break-all">
              {host.processingDir}
            </span>
          </Field>
          <Field
            icon={<FolderIcon className="size-3.5" />}
            label="Cache dir"
            stacked
          >
            <span className="font-mono text-xs break-all">{host.cacheDir}</span>
          </Field>
        </CardContent>
      </Card>

      <HostRecentBatches hostId={host.id} />
    </div>
  );
}

type Sample = {
  cpuLoad: number;
  memUsage: number;
  diskUsage: number;
  runningJobs: number;
  sampledAt: Date;
};

function LiveLoadCard({
  host,
  latest,
  samples,
  isLoading,
  hasError,
}: {
  host: Host;
  latest: Sample | null;
  samples: Sample[];
  isLoading: boolean;
  hasError: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ActivityIcon className="size-4" />
          Live load
        </CardTitle>
        {latest ? (
          <span className="text-muted-foreground text-[11px]">
            sampled <RelativeTime date={latest.sampledAt} withTooltip={false} />
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading && !latest ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : hasError ? (
          <div className="text-muted-foreground text-xs">
            Failed to load metrics.
          </div>
        ) : !latest ? (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <ClockIcon className="size-3.5" />
            Waiting for the first telemetry sample…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LoadGauge
              label="CPU"
              ratio={latest.cpuLoad}
              detail={`${(latest.cpuLoad * host.nbCores).toFixed(1)} / ${host.nbCores} cores`}
              series={samples.map((s) => s.cpuLoad)}
              tone="sky"
            />
            <LoadGauge
              label="Memory"
              ratio={latest.memUsage}
              detail={`${formatBytes(latest.memUsage * host.ram)} / ${formatBytes(host.ram)}`}
              series={samples.map((s) => s.memUsage)}
              tone="violet"
            />
            <LoadGauge
              label="Disk"
              ratio={latest.diskUsage}
              detail={`${formatBytes(latest.diskUsage * host.disk)} / ${formatBytes(host.disk)}`}
              series={samples.map((s) => s.diskUsage)}
              tone="amber"
            />
            <div className="bg-muted/30 rounded-md border p-3">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                Running jobs
              </div>
              <div className="mt-1 text-2xl font-semibold leading-none">
                {latest.runningJobs}
              </div>
              <div className="text-muted-foreground mt-2 text-[11px]">
                {samples.length} sample{samples.length === 1 ? '' : 's'} kept
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadGauge({
  label,
  ratio,
  detail,
  series,
  tone,
}: {
  label: string;
  ratio: number;
  detail?: string;
  series: number[];
  tone: 'sky' | 'violet' | 'amber';
}) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const colorMap = {
    sky: { stroke: '#0ea5e9', fill: 'rgba(14,165,233,0.18)' },
    violet: { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.18)' },
    amber: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.20)' },
  } as const;
  const c = colorMap[tone];
  const chartData = series.map((v, i) => ({
    i,
    v: Math.max(0, Math.min(1, v)),
  }));
  return (
    <div className="bg-muted/30 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-1 h-1.5" />
      {detail ? (
        <div className="text-muted-foreground mt-1.5 truncate text-[11px]">
          {detail}
        </div>
      ) : null}
      {chartData.length > 1 ? (
        <div className="mt-1 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`g-${tone}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.stroke} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={c.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 1]} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={c.stroke}
                strokeWidth={1.5}
                fill={`url(#g-${tone})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  icon,
  label,
  children,
  stacked = false,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          {icon}
          {label}
        </span>
        <span className="text-xs">{children}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-right text-xs">{children}</span>
    </div>
  );
}

function SpecTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'purple';
}) {
  return (
    <div
      className={cn(
        'bg-muted/30 rounded-md border p-2.5',
        accent === 'purple' && 'border-purple-500/30',
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-sm font-medium truncate',
          accent === 'purple' && 'text-purple-600',
        )}
        title={value}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-muted-foreground text-[10px]">{hint}</div>
      ) : null}
    </div>
  );
}
