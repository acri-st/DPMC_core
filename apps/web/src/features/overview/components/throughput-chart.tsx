import { useMemo, useState, type CSSProperties } from 'react';
import { AreaChartIcon, BarChart3Icon } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/shared/components/ui/toggle-group';
import type { Task } from '@/features/task/types';

type ThroughputChartProps = {
  tasks: Task[];
  isLoading: boolean;
};

type ChartMode = 'bars' | 'area';

const HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;
const SUCCESS_COLOR = '#10b981';
const FAILED_COLOR = '#f43f5e';

// Recharts tooltips render with an inline white background by default, which is
// unreadable in dark mode. Drive them off the theme's popover tokens instead.
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  borderRadius: 6,
  fontSize: 12,
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
};
const TOOLTIP_LABEL_STYLE: CSSProperties = {
  fontWeight: 600,
  color: 'var(--popover-foreground)',
};

export function ThroughputChart({ tasks, isLoading }: ThroughputChartProps) {
  const [mode, setMode] = useState<ChartMode>('bars');
  const buckets = useMemo(() => buildBuckets(tasks), [tasks]);
  const total = useMemo(
    () => buckets.reduce((acc, b) => acc + b.success + b.failed, 0),
    [buckets],
  );
  const hasFailures = useMemo(
    () => buckets.some((b) => b.failed > 0),
    [buckets],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Throughput (24h)</CardTitle>
            <CardDescription className="text-xs">
              {isLoading
                ? 'Loading task history…'
                : `${total} task${total === 1 ? '' : 's'} ended in the last 24 hours.`}
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            value={mode}
            onValueChange={(next) => {
              if (next === 'bars' || next === 'area') setMode(next);
            }}
            aria-label="Chart mode"
          >
            <ToggleGroupItem value="bars" aria-label="Stacked bars">
              <BarChart3Icon />
            </ToggleGroupItem>
            <ToggleGroupItem value="area" aria-label="Area chart">
              <AreaChartIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'bars' ? (
                <BarChart
                  data={buckets}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    width={30}
                  />
                  <Tooltip
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                  />
                  <Bar
                    stackId="1"
                    dataKey="success"
                    fill={SUCCESS_COLOR}
                    name="Success"
                    radius={hasFailures ? [0, 0, 0, 0] : [2, 2, 0, 0]}
                  />
                  {hasFailures ? (
                    <Bar
                      stackId="1"
                      dataKey="failed"
                      fill={FAILED_COLOR}
                      name="Failed"
                      radius={[2, 2, 0, 0]}
                    />
                  ) : null}
                </BarChart>
              ) : (
                // Non-stacked: each series goes from y=0 to its own value,
                // so failed=0 buckets visibly drop the failed curve to the
                // baseline instead of riding on top of success.
                <AreaChart
                  data={buckets}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="success-grad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={SUCCESS_COLOR}
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="95%"
                        stopColor={SUCCESS_COLOR}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="failed-grad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={FAILED_COLOR}
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="95%"
                        stopColor={FAILED_COLOR}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stroke={SUCCESS_COLOR}
                    fill="url(#success-grad)"
                    name="Success"
                  />
                  {hasFailures ? (
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stroke={FAILED_COLOR}
                      fill="url(#failed-grad)"
                      name="Failed"
                    />
                  ) : null}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type Bucket = {
  ts: number;
  label: string;
  success: number;
  failed: number;
};

function buildBuckets(tasks: Task[]): Bucket[] {
  const now = Date.now();
  const startMs = floorToHour(now - (HOURS - 1) * HOUR_MS);
  const buckets: Bucket[] = [];
  for (let i = 0; i < HOURS; i++) {
    const ts = startMs + i * HOUR_MS;
    buckets.push({
      ts,
      label: hourLabel(ts),
      success: 0,
      failed: 0,
    });
  }

  for (const t of tasks) {
    if (!t.completedAt) continue;
    if (t.status !== 'Done' && t.status !== 'Error') continue;
    const endedMs = new Date(t.completedAt).getTime();
    if (!Number.isFinite(endedMs)) continue;
    const idx = Math.floor((endedMs - startMs) / HOUR_MS);
    if (idx < 0 || idx >= HOURS) continue;
    if (t.status === 'Done') buckets[idx].success += 1;
    else buckets[idx].failed += 1;
  }

  return buckets;
}

function floorToHour(ms: number): number {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function hourLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:00`;
}
