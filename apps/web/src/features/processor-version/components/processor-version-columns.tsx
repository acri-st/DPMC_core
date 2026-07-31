import { format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/shared/components/ui/badge';
import type { ProcessorVersion } from '@/features/processor-version/types';

type ProcessorVersionColumnsOptions = {
  /** Auxiliary configuration name lookup, keyed by id. */
  auxNameById: Record<string, string>;
};

export function buildProcessorVersionColumns({
  auxNameById,
}: ProcessorVersionColumnsOptions): ColumnDef<ProcessorVersion>[] {
  return [
    {
      accessorKey: 'baseline',
      header: 'Baseline',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.baseline}</span>
      ),
    },
    {
      accessorKey: 'processingScriptVersionId',
      header: 'Script version',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {String(row.original.processingScriptVersionId).slice(0, 8)}
        </Badge>
      ),
    },
    {
      accessorKey: 'auxiliaryConfigurationId',
      header: 'Aux config',
      cell: ({ row }) => {
        const id = row.original.auxiliaryConfigurationId;
        return (
          <span className="text-xs">
            {auxNameById[id] ?? String(id).slice(0, 8)}
          </span>
        );
      },
    },
    {
      accessorKey: 'comment',
      header: 'Comment',
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-1 text-xs">
          {row.original.comment ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs">
          {format(new Date(row.original.createdAt), 'PP')}
        </span>
      ),
    },
  ];
}
