import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { RelativeTime } from '@/shared/components/relative-time';
import { RowActions } from '@/shared/components/row-actions';
import type { ProductionChainSummary } from '@/features/production-chain/types';

type ProductionChainColumnsOptions = {
  onView: (id: number) => void;
};

export function buildProductionChainColumns({
  onView,
}: ProductionChainColumnsOptions): ColumnDef<ProductionChainSummary>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => <Badge variant="outline">{row.original.kind}</Badge>,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="secondary">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => (
        <RelativeTime
          date={row.original.updatedAt}
          className="text-muted-foreground text-xs"
        />
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          label={`Actions for production chain ${row.original.name}`}
          actions={[
            {
              label: 'View details',
              icon: EyeIcon,
              onSelect: () => onView(row.original.id),
            },
          ]}
        />
      ),
    },
  ];
}
