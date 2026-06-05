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
import type { OverviewStats } from '@/features/overview/hooks/use-overview-data';

type KpiCardsProps = {
  stats: OverviewStats;
};

export function KpiCards({ stats }: KpiCardsProps) {
  const downHosts = stats.hostsTotal - stats.hostsUp;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        icon={LayersIcon}
        label="Batches running"
        value={stats.batchesRunning.toString()}
        tone="info"
      />
      <Kpi
        icon={ActivityIcon}
        label="Tasks running"
        value={stats.tasksRunning.toString()}
        tone="info"
      />
      <Kpi
        icon={ServerIcon}
        label="Hosts up"
        value={
          stats.hostsTotal > 0 ? `${stats.hostsUp} / ${stats.hostsTotal}` : '—'
        }
        tone={downHosts > 0 ? 'warn' : 'ok'}
        sub={downHosts > 0 ? `${downHosts} down` : 'all healthy'}
      />
      <Kpi
        icon={LeafIcon}
        label="CO₂ (last 24h)"
        value={formatCo2(stats.co2Last24hGrams)}
        tone="ok"
      />
    </div>
  );
}

type KpiProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'info' | 'warn';
};

function Kpi({ icon: Icon, label, value, sub, tone = 'info' }: KpiProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Icon
            className={cn(
              'size-3.5',
              tone === 'ok' && 'text-emerald-500',
              tone === 'info' && 'text-sky-500',
              tone === 'warn' && 'text-amber-500',
            )}
          />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground pt-0 text-xs">
        {sub ?? ' '}
      </CardContent>
    </Card>
  );
}
