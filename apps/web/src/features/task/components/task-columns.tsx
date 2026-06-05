import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { EyeIcon, PlayIcon, Trash2Icon } from 'lucide-react';

import { RowActions } from '@/shared/components/row-actions';
import { TaskStatusBadge } from '@/features/task/components/task-status-badge';
import { TaskKindBadge } from '@/features/task/components/task-kind-badge';
import type { Task } from '@/features/task/types';

type TaskColumnsOptions = {
  onView: (id: number) => void;
  onTrigger: (id: number) => void;
  onDelete: (id: number) => void;
  isMutating?: boolean;
};

export function buildTaskColumns({
  onView,
  onTrigger,
  onDelete,
  isMutating,
}: TaskColumnsOptions): ColumnDef<Task>[] {
  return [
    {
      accessorKey: 'executionTag',
      header: 'Execution tag',
      cell: ({ row }) => (
        <span className="block max-w-[260px] truncate font-mono text-xs">
          {row.original.executionTag}
        </span>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => <TaskKindBadge kind={row.original.kind} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'scheduledStartTime',
      header: 'Scheduled',
      cell: ({ row }) => (
        <span className="text-xs">
          {formatDistanceToNow(new Date(row.original.scheduledStartTime), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.priority}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const t = row.original;
        return (
          <RowActions
            label={`Actions for task ${t.executionTag}`}
            actions={[
              {
                label: 'View details',
                icon: EyeIcon,
                onSelect: () => onView(t.id),
              },
              {
                label: 'Trigger',
                icon: PlayIcon,
                disabled: isMutating,
                onSelect: () => onTrigger(t.id),
              },
              {
                label: 'Delete',
                icon: Trash2Icon,
                variant: 'destructive',
                separatorBefore: true,
                disabled: isMutating,
                onSelect: () => onDelete(t.id),
                confirm: {
                  title: 'Delete task?',
                  description: `"${t.executionTag}" will be permanently deleted. This cannot be undone.`,
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
