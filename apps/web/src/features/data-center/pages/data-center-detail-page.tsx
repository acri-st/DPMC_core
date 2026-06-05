import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BoltIcon,
  Loader2Icon,
  MapPinIcon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/data-table';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { HostCard } from '@/features/host/components/host-card';
import { buildHostColumns } from '@/features/host/components/host-columns';
import { DataCenterMap } from '@/features/data-center/components/data-center-map';
import { useDataCenter } from '@/features/data-center/hooks/use-data-center';

export function DataCenterDetailPage() {
  const { id } = useParams({ from: '/data-center/$id' });
  const [viewMode, setViewMode] = useViewMode('data-center-hosts', 'list');
  const navigate = useNavigate();
  const goToHost = (hostId: number) =>
    navigate({ to: '/hosts/$id', params: { id: String(hostId) } });
  const { data, isLoading, isError, error } = useDataCenter(Number(id));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/data-center">
            <ArrowLeftIcon />
            Back to list
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-card flex h-40 items-center justify-center rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading data center…
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load data center'}</span>
        </div>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="truncate">{data.name}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {data.code}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-3" />
                      {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Stat
                icon={<BoltIcon className="size-3.5" />}
                label="PUE"
                value={data.pue.toFixed(2)}
              />
              <Stat
                label="Emission factor"
                value={`${data.emissionFactor} g/kWh`}
              />
              <Stat
                label="Energy intensity"
                value={`${data.energyIntensity} kWh/u`}
              />
              <Stat label="Hosts" value={data.hosts.length.toString()} />
            </CardContent>
          </Card>

          <DataCenterMap
            dataCenters={[data]}
            selectedId={data.id}
            fallbackZoom={6}
            className="h-56"
          />

          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Hosts</h2>
              <p className="text-muted-foreground text-xs">
                Workers attached to this data center.
              </p>
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.hosts.length === 0 ? (
                <div className="text-muted-foreground rounded-md border p-6 text-center text-sm sm:col-span-2 xl:col-span-3">
                  No hosts attached.
                </div>
              ) : (
                data.hosts.map((host) => (
                  <HostCard
                    key={host.id}
                    host={host}
                    onSelect={() => goToHost(host.id)}
                  />
                ))
              )}
            </div>
          ) : (
            <DataTable
              data={data.hosts}
              columns={buildHostColumns({ onView: goToHost })}
              onRowClick={(row) => goToHost(row.id)}
              emptyMessage="No hosts attached."
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/30 rounded-md border p-3">
      <div className="text-muted-foreground inline-flex items-center gap-1 text-[11px] uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
