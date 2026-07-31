import type { ColumnDef } from '@tanstack/react-table';
import type { ProductType } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { RelativeTime } from '@/shared/components/relative-time';

export function buildProductTypeColumns(): ColumnDef<ProductType>[] {
  return [
    {
      accessorKey: 'acronym',
      header: 'Acronym',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {row.original.acronym}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    },
    {
      accessorKey: 'processingLevel',
      header: 'Processing level',
      cell: ({ row }) => {
        const level = row.original.processingLevel;
        if (!level) return <span className="text-muted-foreground">—</span>;
        return <Badge variant="outline">{level}</Badge>;
      },
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
