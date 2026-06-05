import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/shared/components/ui/badge';
import { RelativeTime } from '@/shared/components/relative-time';
import type { Dataset } from '@/features/dataset/types';

export function buildDatasetColumns(): ColumnDef<Dataset>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const ds = row.original;
        return (
          <Link
            to="/datasets/$datasetId"
            params={{ datasetId: String(ds.id) }}
            className="hover:text-primary font-mono text-xs"
          >
            {ds.name ?? <em className="text-muted-foreground">unnamed</em>}
          </Link>
        );
      },
    },
    {
      accessorKey: 'producedByBatchId',
      header: 'Origin',
      cell: ({ row }) =>
        row.original.producedByBatchId ? (
          <Badge variant="outline">Batch output</Badge>
        ) : (
          <Badge variant="secondary">Manual</Badge>
        ),
    },
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {String(row.original.id).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <RelativeTime
          date={row.original.createdAt}
          className="text-muted-foreground text-xs"
        />
      ),
    },
  ];
}
