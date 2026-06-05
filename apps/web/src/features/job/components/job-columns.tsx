import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { EyeIcon } from 'lucide-react';

import { RowActions } from '@/shared/components/row-actions';
import { JobStatusBadge } from '@/features/job/components/job-status-badge';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';
import type { Job } from '@/features/job/types';

export type JobRowContext = {
  scriptLabelByVersionId: Record<number, string>;
  hostnameById: Record<number, string>;
  onView: (id: number) => void;
};

export function buildJobColumns(ctx: JobRowContext): ColumnDef<Job>[] {
  return [
    {
      accessorKey: 'executionTag',
      header: 'Execution tag',
      cell: ({ row }) => (
        <span className="truncate font-mono text-xs">
          {row.original.executionTag}
        </span>
      ),
    },
    {
      accessorKey: 'processingScriptVersionId',
      header: 'Script',
      cell: ({ row }) => {
        const id = row.original.processingScriptVersionId;
        const label = ctx.scriptLabelByVersionId[id] ?? String(id).slice(0, 8);
        return <span className="font-medium">{label}</span>;
      },
    },
    {
      accessorKey: 'batchId',
      header: 'Batch',
      cell: ({ row }) => (
        <Link
          to="/batches/$id"
          params={{ id: String(row.original.batchId) }}
          onClick={(e) => e.stopPropagation()}
          className="hover:text-primary font-mono text-xs underline-offset-2 hover:underline"
        >
          {String(row.original.batchId).slice(0, 8)}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'hostId',
      header: 'Host',
      cell: ({ row }) => {
        const id = row.original.hostId;
        if (!id) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-xs">
            {ctx.hostnameById[id] ?? String(id).slice(0, 8)}
          </span>
        );
      },
    },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: ({ row }) => {
        const v = row.original.startedAt;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-xs">
            {formatDistanceToNow(new Date(v), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const dur = durationBetween(
          row.original.startedAt,
          row.original.endedAt,
        );
        return (
          <span className="font-mono text-xs">{formatDurationMs(dur)}</span>
        );
      },
    },
    {
      accessorKey: 'avgPower',
      header: 'Avg power',
      cell: ({ row }) => {
        const v = row.original.avgPower;
        if (v === null || v === undefined)
          return <span className="text-muted-foreground">—</span>;
        return <span className="text-xs">{v.toFixed(1)} W</span>;
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          label={`Actions for job ${row.original.executionTag}`}
          actions={[
            {
              label: 'View details',
              icon: EyeIcon,
              onSelect: () => ctx.onView(row.original.id),
            },
          ]}
        />
      ),
    },
  ];
}

export const JOB_HIDDEN_COLUMNS = ['avgPower'];
