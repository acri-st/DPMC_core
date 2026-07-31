import type { Co2Concern, TransferSource } from '@dpmc/client';

import { cn } from '@/shared/utils';
import { formatCo2 } from '@/features/batch/libs/format-co2';

export const CO2_CONCERNS = [
  {
    key: 'cpu',
    label: 'CPU',
    activity: 'Computation',
    color: 'var(--co2-cpu)',
  },
  {
    key: 'gpu',
    label: 'GPU',
    activity: 'Computation',
    color: 'var(--co2-gpu)',
  },
  {
    key: 'ingress',
    label: 'Ingress',
    activity: 'Transfer',
    color: 'var(--co2-ingress)',
  },
  {
    key: 'egress',
    label: 'Egress',
    activity: 'Transfer',
    color: 'var(--co2-egress)',
  },
] as const satisfies ReadonlyArray<{
  key: keyof Co2Concern;
  label: string;
  activity: string;
  color: string;
}>;

function total(concerns: Co2Concern): number {
  return concerns.cpu + concerns.gpu + concerns.ingress + concerns.egress;
}

type Co2BarProps = {
  concerns: Co2Concern;
  className?: string;
};

export function Co2Bar({ concerns, className }: Co2BarProps) {
  const sum = total(concerns);

  if (sum <= 0) {
    return (
      <div
        className={cn('bg-muted h-2 w-full rounded-full', className)}
        aria-hidden
      />
    );
  }

  const segments = CO2_CONCERNS.map((concern) => ({
    ...concern,
    value: concerns[concern.key],
    share: (concerns[concern.key] / sum) * 100,
  })).filter((segment) => segment.share > 0);

  return (
    <div className={cn('flex h-2 w-full gap-0.5', className)} aria-hidden>
      {segments.map((segment, index) => (
        <div
          key={segment.key}
          className={cn(
            'h-full min-w-0.5',
            index === 0 && 'rounded-l-full',
            index === segments.length - 1 && 'rounded-r-full',
          )}
          style={{
            width: `${segment.share}%`,
            backgroundColor: segment.color,
          }}
        />
      ))}
    </div>
  );
}

const TRANSFER_SOURCE_LABEL: Record<TransferSource, string> = {
  cadvisor: 'Transfer from staged volumes + pod network',
  staged: 'Transfer from staged volumes — excludes self-fetched inputs',
  none: 'Transfer not measured',
};

type Co2BreakdownProps = {
  concerns: Co2Concern;
  energyWh?: Co2Concern | null;
  transferSource?: TransferSource | null;
  transferSourceMixed?: boolean | null;
  className?: string;
};

export function Co2Breakdown({
  concerns,
  energyWh,
  transferSource,
  transferSourceMixed,
  className,
}: Co2BreakdownProps) {
  const sum = total(concerns);

  return (
    <div className={cn('space-y-2', className)}>
      <Co2Bar concerns={concerns} />

      <dl className="space-y-1 text-xs">
        {CO2_CONCERNS.map((concern) => {
          const grams = concerns[concern.key];
          const share = sum > 0 ? (grams / sum) * 100 : 0;

          return (
            <div
              key={concern.key}
              className="flex items-baseline justify-between gap-2"
            >
              <dt className="text-muted-foreground flex min-w-0 items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: concern.color }}
                />
                <span className="truncate" title={concern.activity}>
                  {concern.label}
                </span>
              </dt>
              <dd className="text-foreground shrink-0 tabular-nums">
                {formatCo2(grams)}
                <span className="text-muted-foreground ml-1 inline-block w-8 text-right">
                  {sum > 0 ? `${share.toFixed(0)}%` : '—'}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="text-muted-foreground space-y-0.5 text-xs">
        {energyWh ? <p>{formatWh(total(energyWh))} consumed</p> : null}
        {transferSource ? (
          <p>
            {transferSourceMixed
              ? 'Transfer measured differently across this batch’s jobs'
              : TRANSFER_SOURCE_LABEL[transferSource]}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function describeConcerns(concerns: Co2Concern): string {
  return CO2_CONCERNS.map(
    (concern) => `${concern.label} ${formatCo2(concerns[concern.key])}`,
  ).join(' · ');
}

function formatWh(wh: number): string {
  if (wh >= 1_000_000) return `${(wh / 1_000_000).toFixed(2)} MWh`;
  if (wh >= 1000) return `${(wh / 1000).toFixed(2)} kWh`;
  return `${wh.toFixed(2)} Wh`;
}
