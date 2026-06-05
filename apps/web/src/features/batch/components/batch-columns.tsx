import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCwIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { RowActions } from '@/shared/components/row-actions';
import { BatchStatusBadge } from '@/features/batch/components/batch-status-badge';
import {
  durationBetween,
  formatDurationMs,
} from '@/features/batch/libs/format-duration';
import { formatCo2 } from '@/features/batch/libs/format-co2';
import { useReplayBatch } from '@/features/batch/hooks/use-replay-batch';
import type { Batch } from '@/features/batch/types';

export type BatchRowContext = {
  chainNameById: Record<string, string>;
};

function BatchActions({ batchId }: { batchId: number }) {
  const replay = useReplayBatch();
  return (
    <RowActions
      label="Batch actions"
      actions={[
        {
          label: 'Replay',
          icon: RefreshCwIcon,
          disabled: replay.isPending,
          onSelect: () => replay.mutate(batchId),
        },
      ]}
    />
  );
}

export function buildBatchColumns(_ctx: BatchRowContext): ColumnDef<Batch>[] {
  return [
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => <Badge variant="outline">{row.original.kind}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <BatchStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.priority}</span>
      ),
    },
    {
      accessorKey: 'scheduledAt',
      header: 'Scheduled',
      cell: ({ row }) => {
        const v = row.original.scheduledAt;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-xs">
            {formatDistanceToNow(new Date(v), { addSuffix: true })}
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
      accessorKey: 'co2Grams',
      header: 'CO₂',
      cell: ({ row }) => {
        const g = row.original.co2Grams;
        if (g === null || g === undefined)
          return <span className="text-muted-foreground">—</span>;
        return <span>{formatCo2(g)}</span>;
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => <BatchActions batchId={row.original.id} />,
    },
  ];
}

/**
 * Columns hidden by default — toggleable via column visibility menu.
 * Keys must match the column id (accessorKey or explicit id).
 */
export const BATCH_HIDDEN_COLUMNS = ['priority', 'scheduledAt', 'co2Grams'];
