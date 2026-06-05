import { PencilIcon, StarIcon, Trash2Icon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseMutationResult } from '@tanstack/react-query';

import { Badge } from '@/shared/components/ui/badge';
import { RowActions, type RowAction } from '@/shared/components/row-actions';
import type { Project } from '@dpmc/client';

type ProjectActionsContext = {
  setDefault: UseMutationResult<unknown, Error, number>;
  remove: UseMutationResult<unknown, Error, number>;
  onEdit: (id: number) => void;
};

export function buildProjectColumns({
  setDefault,
  remove,
  onEdit,
}: ProjectActionsContext): ColumnDef<Project>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.isDefault ? (
            <Badge variant="outline">Default</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'identifier',
      header: 'Identifier',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.identifier}</span>
      ),
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
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const actions: RowAction[] = [
          { label: 'Edit', icon: PencilIcon, onSelect: () => onEdit(p.id) },
        ];
        if (!p.isDefault) {
          actions.push({
            label: 'Set default',
            icon: StarIcon,
            onSelect: () => setDefault.mutate(p.id),
            disabled: setDefault.isPending,
          });
        }
        actions.push({
          label: 'Delete',
          icon: Trash2Icon,
          variant: 'destructive',
          separatorBefore: true,
          disabled: remove.isPending || p.isDefault,
          onSelect: () => remove.mutate(p.id),
          confirm: {
            title: 'Delete project?',
            description: `"${p.name}" will be permanently deleted. This cannot be undone.`,
            confirmLabel: 'Delete',
          },
        });
        return (
          <RowActions
            label={`Actions for project ${p.name}`}
            actions={actions}
          />
        );
      },
    },
  ];
}
