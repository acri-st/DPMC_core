import type { ColumnDef } from '@tanstack/react-table';
import { CpuIcon, EyeIcon, ZapIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { RelativeTime } from '@/shared/components/relative-time';
import { RowActions, type RowAction } from '@/shared/components/row-actions';
import { formatBytes } from '@/shared/libs/format-bytes';
import { cn } from '@/shared/utils';
import { HostStatusBadge } from '@/features/host/components/host-status-badge';
import type { Host } from '@/features/host/types';

const HEARTBEAT_STALE_MS = 5 * 60 * 1000; // 5 minutes

type HostColumnsOptions = {
  onView: (id: number) => void;
  /** Extra row actions appended to the menu (e.g. "Remove from pool"). */
  extraActions?: (host: Host) => RowAction[];
};

export function buildHostColumns({
  onView,
  extraActions,
}: HostColumnsOptions): ColumnDef<Host>[] {
  return [
    {
      accessorKey: 'hostname',
      header: 'Hostname',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.hostname}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <HostStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.ipAddress}</span>
      ),
    },
    {
      accessorKey: 'osType',
      header: 'OS',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.osType} · {row.original.osVersion}
        </Badge>
      ),
    },
    {
      accessorKey: 'nbCores',
      header: 'Cores',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-xs">
          <CpuIcon className="size-3.5" />
          {row.original.nbCores}
        </span>
      ),
    },
    {
      accessorKey: 'ram',
      header: 'RAM',
      cell: ({ row }) => formatBytes(row.original.ram),
    },
    {
      accessorKey: 'gpuCount',
      header: 'GPU',
      cell: ({ row }) => {
        if (!row.original.hasGpu)
          return <span className="text-muted-foreground">—</span>;
        return (
          <Badge
            variant="outline"
            className="gap-1 border-purple-500/30 text-purple-600"
          >
            <ZapIcon className="size-3" />
            {row.original.gpuCount}× {row.original.gpuModel ?? 'GPU'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'containerRuntime',
      header: 'Runtime',
      cell: ({ row }) => {
        const r = row.original.containerRuntime;
        const tone =
          r === 'Docker'
            ? 'border-sky-500/40 text-sky-600'
            : r === 'Apptainer'
              ? 'border-indigo-500/40 text-indigo-600'
              : r === 'Kubernetes'
                ? 'border-blue-600/40 text-blue-700'
                : 'border-zinc-400/40 text-zinc-500';
        return (
          <Badge variant="outline" className={tone}>
            {r}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'lastHeartbeatAt',
      header: 'Last heartbeat',
      cell: ({ row }) => {
        const v = row.original.lastHeartbeatAt;
        if (!v) return <span className="text-muted-foreground">never</span>;
        const ageMs = Date.now() - new Date(v).getTime();
        const stale = ageMs > HEARTBEAT_STALE_MS;
        return (
          <RelativeTime
            date={v}
            className={cn(
              'text-xs',
              stale ? 'font-medium text-rose-600' : 'text-muted-foreground',
            )}
          />
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          label={`Actions for host ${row.original.hostname}`}
          actions={[
            {
              label: 'View details',
              icon: EyeIcon,
              onSelect: () => onView(row.original.id),
            },
            ...(extraActions?.(row.original) ?? []),
          ]}
        />
      ),
    },
  ];
}
