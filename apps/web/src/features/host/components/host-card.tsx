import { CpuIcon, MemoryStickIcon, ServerIcon, ZapIcon } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { RelativeTime } from '@/shared/components/relative-time';
import { formatBytes } from '@/shared/libs/format-bytes';
import { cn } from '@/shared/utils';
import { HostStatusBadge } from '@/features/host/components/host-status-badge';
import type { Host } from '@/features/host/types';

type HostCardProps = {
  host: Host;
  onSelect: () => void;
};

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

export function HostCard({ host, onSelect }: HostCardProps) {
  const heartbeatStale =
    host.lastHeartbeatAt &&
    Date.now() - new Date(host.lastHeartbeatAt).getTime() > HEARTBEAT_STALE_MS;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="focus-visible:ring-ring/50 w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2"
    >
      <Card className="hover:border-primary/40 hover:shadow-sm h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex min-w-0 items-center gap-2 truncate">
              <ServerIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate">{host.hostname}</span>
            </CardTitle>
            <HostStatusBadge status={host.status} />
          </div>
          <CardDescription className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-mono">
              {host.ipAddress}
            </Badge>
            <Badge variant="outline">{host.osType}</Badge>
            <Badge
              variant="outline"
              className={cn(
                host.containerRuntime === 'Docker'
                  ? 'border-sky-500/40 text-sky-600'
                  : host.containerRuntime === 'Apptainer'
                    ? 'border-indigo-500/40 text-indigo-600'
                    : host.containerRuntime === 'Kubernetes'
                      ? 'border-blue-600/40 text-blue-700'
                      : 'border-zinc-400/40 text-zinc-500',
              )}
            >
              {host.containerRuntime}
            </Badge>
            {host.hasGpu ? (
              <Badge
                variant="outline"
                className="gap-1 border-purple-500/40 text-purple-600"
              >
                <ZapIcon className="size-3" />
                {host.gpuCount}× {host.gpuModel ?? 'GPU'}
              </Badge>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <CpuIcon className="size-3.5" />
            {host.nbCores} cores
          </div>
          <div className="flex items-center gap-1.5">
            <MemoryStickIcon className="size-3.5" />
            {formatBytes(host.ram)}
          </div>
          <div className="col-span-2 flex items-center justify-between gap-2">
            <span>Last heartbeat</span>
            <RelativeTime
              date={host.lastHeartbeatAt}
              className={cn(
                'text-xs',
                heartbeatStale ? 'font-medium text-rose-600' : '',
              )}
            />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
