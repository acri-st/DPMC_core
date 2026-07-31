import { ActivityIcon, LayersIcon, LeafIcon, ServerIcon } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/utils';
import { formatCo2 } from '@/features/batch/libs/format-co2';
import { CO2_CONCERNS } from '@/shared/components/co2-breakdown';
import type {
  OverviewStats,
  TaskStatusSummary,
  BatchStatusSummary,
} from '@/features/overview/hooks/use-overview-data';

type KpiCardsProps = {
  stats: OverviewStats;
  taskSummary: TaskStatusSummary | null;
  batchSummary: BatchStatusSummary | null;
};

type Tone = 'ok' | 'info' | 'warn' | 'danger' | 'muted';
type BreakdownItem = {
  label: string;
  value: number | string;
  tone?: Tone;
  dotColor?: string;
};

const DOT_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-500',
  info: 'bg-sky-500',
  warn: 'bg-amber-500',
  danger: 'bg-rose-500',
  muted: 'bg-muted-foreground/50',
};
const ICON_CLASS: Record<Tone, string> = {
  ok: 'text-emerald-500',
  info: 'text-sky-500',
  warn: 'text-amber-500',
  danger: 'text-rose-500',
  muted: 'text-muted-foreground',
};

export function KpiCards({ stats, taskSummary, batchSummary }: KpiCardsProps) {
  const downHosts = stats.hostsTotal - stats.hostsUp;

  const batchBreakdown: BreakdownItem[] = batchSummary
    ? [
        { label: 'Pending', value: batchSummary.Pending, tone: 'muted' },
        { label: 'Running', value: batchSummary.Running, tone: 'info' },
        { label: 'Success', value: batchSummary.Success, tone: 'ok' },
        { label: 'Failed', value: batchSummary.Failed, tone: 'danger' },
        { label: 'Cancelled', value: batchSummary.Cancelled, tone: 'warn' },
      ]
    : [];
  const taskBreakdown: BreakdownItem[] = taskSummary
    ? [
        { label: 'Edited', value: taskSummary.Edited, tone: 'muted' },
        { label: 'Queued', value: taskSummary.Queued, tone: 'warn' },
        { label: 'Running', value: taskSummary.Running, tone: 'info' },
        { label: 'Done', value: taskSummary.Done, tone: 'ok' },
        { label: 'Error', value: taskSummary.Error, tone: 'danger' },
        { label: 'Suspended', value: taskSummary.Suspended, tone: 'muted' },
      ]
    : [];
  const hostBreakdown: BreakdownItem[] = [
    { label: 'Up', value: stats.hostsByStatus.Up, tone: 'ok' },
    { label: 'Busy', value: stats.hostsByStatus.Busy, tone: 'info' },
    { label: 'Off', value: stats.hostsByStatus.Off, tone: 'muted' },
    { label: 'Maint.', value: stats.hostsByStatus.Maintenance, tone: 'warn' },
  ];
  const co2Breakdown: BreakdownItem[] =
    stats.co2Last24hGrams > 0
      ? CO2_CONCERNS.map((concern) => ({
          label: concern.label,
          value: formatCo2(stats.co2Last24hByConcern[concern.key]),
          dotColor: concern.color,
        }))
      : [];

  const batchTotal = batchSummary
    ? Object.values(batchSummary).reduce((a, b) => a + b, 0)
    : null;
  const taskTotal = taskSummary
    ? Object.values(taskSummary).reduce((a, b) => a + b, 0)
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        icon={LayersIcon}
        label="Batches"
        value={`${batchSummary?.Running ?? stats.batchesRunning}`}
        unit="running"
        tone="info"
        total={batchTotal}
        breakdown={batchBreakdown}
      />
      <Kpi
        icon={ActivityIcon}
        label="Tasks"
        value={`${taskSummary?.Running ?? stats.tasksRunning}`}
        unit="running"
        tone="info"
        total={taskTotal}
        breakdown={taskBreakdown}
      />
      <Kpi
        icon={ServerIcon}
        label="Hosts"
        value={
          stats.hostsTotal > 0 ? `${stats.hostsUp} / ${stats.hostsTotal}` : '—'
        }
        unit="up"
        tone={downHosts > 0 ? 'warn' : 'ok'}
        breakdown={stats.hostsTotal > 0 ? hostBreakdown : []}
      />
      <Kpi
        icon={LeafIcon}
        label="CO₂ (last 24h)"
        value={formatCo2(stats.co2Last24hGrams)}
        tone="ok"
        breakdown={co2Breakdown}
      />
    </div>
  );
}

type KpiProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  unit?: string;
  total?: number | null;
  tone?: Tone;
  breakdown?: BreakdownItem[];
};

function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  total,
  tone = 'info',
  breakdown = [],
}: KpiProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between gap-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <Icon className={cn('size-3.5', ICON_CLASS[tone])} />
            {label}
          </span>
          {total != null ? (
            <span className="text-muted-foreground tabular-nums">
              {total} total
            </span>
          ) : null}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold">
          {value}
          {unit ? (
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              {unit}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {breakdown.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {breakdown.map((b) => (
              <span
                key={b.label}
                className="text-muted-foreground inline-flex items-center gap-1"
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    !b.dotColor && DOT_CLASS[b.tone ?? 'muted'],
                  )}
                  style={
                    b.dotColor ? { backgroundColor: b.dotColor } : undefined
                  }
                />
                {b.label}
                <span className="text-foreground tabular-nums">{b.value}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">&nbsp;</span>
        )}
      </CardContent>
    </Card>
  );
}
