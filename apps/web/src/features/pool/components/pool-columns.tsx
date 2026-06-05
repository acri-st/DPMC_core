import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon, Trash2Icon } from 'lucide-react';
import type { Pool } from '@dpmc/client';

import { RowActions } from '@/shared/components/row-actions';

type PoolColumnsOptions = {
  onView: (id: number) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
};

export function buildPoolColumns({
  onView,
  onDelete,
  isDeleting,
}: PoolColumnsOptions): ColumnDef<Pool>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'comment',
      header: 'Comment',
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-1">
          {row.original.comment ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <RowActions
            label={`Actions for pool ${p.name}`}
            actions={[
              {
                label: 'View details',
                icon: EyeIcon,
                onSelect: () => onView(p.id),
              },
              {
                label: 'Delete',
                icon: Trash2Icon,
                variant: 'destructive',
                separatorBefore: true,
                disabled: isDeleting,
                onSelect: () => onDelete(p.id),
                confirm: {
                  title: 'Delete pool?',
                  description: `"${p.name}" will be permanently deleted. This cannot be undone.`,
                  confirmLabel: 'Delete',
                },
              },
            ]}
          />
        );
      },
    },
  ];
}
