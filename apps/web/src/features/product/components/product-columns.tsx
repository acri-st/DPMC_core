import type { ColumnDef } from '@tanstack/react-table';
import type { Product, ProductType } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { RelativeTime } from '@/shared/components/relative-time';

export function buildProductColumns(
  productTypeById: Map<number, ProductType>,
): ColumnDef<Product>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'productTypeId',
      header: 'Type',
      cell: ({ row }) => {
        const type = productTypeById.get(row.original.productTypeId);
        if (!type) {
          return (
            <span className="text-muted-foreground font-mono text-xs">
              {String(row.original.productTypeId).slice(0, 8)}…
            </span>
          );
        }
        return <Badge variant="outline">{type.acronym}</Badge>;
      },
    },
    {
      id: 'processingLevel',
      header: 'Processing level',
      cell: ({ row }) => {
        const level = productTypeById.get(
          row.original.productTypeId,
        )?.processingLevel;
        if (level == null || level === '')
          return <span className="text-muted-foreground">—</span>;
        return <Badge variant="secondary">L{level}</Badge>;
      },
    },
    {
      accessorKey: 'generatedAt',
      header: 'Generated',
      cell: ({ row }) => {
        const v = row.original.generatedAt;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <RelativeTime date={v} className="text-muted-foreground text-xs" />
        );
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
