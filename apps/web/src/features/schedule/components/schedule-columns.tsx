import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircleIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { RowActions } from '@/shared/components/row-actions';
import { Switch } from '@/shared/components/ui/switch';
import { TaskKindBadge } from '@/features/task/components/task-kind-badge';
import { describeCron } from '@/features/schedule/libs/cron-describe';
import type { Schedule } from '@/features/schedule/services/schedule.service';

type ScheduleColumnsOptions = {
  chainNames: Map<number, string>;
  processorNames: Map<number, string>;
  onToggle: (id: number, enabled: boolean) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

/** Stops a row-level click (navigation) when interacting with inline controls. */
function stop(e: React.MouseEvent) {
  e.stopPropagation();
}

export function buildScheduleColumns({
  chainNames,
  processorNames,
  onToggle,
  onEdit,
  onDelete,
}: ScheduleColumnsOptions): ColumnDef<Schedule>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate font-medium">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => <TaskKindBadge kind={row.original.kind} />,
    },
    {
      id: 'target',
      header: 'Target',
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original;
        const target =
          s.kind === 'Chain'
            ? s.productionChainId != null
              ? chainNames.get(s.productionChainId)
              : undefined
            : s.processorVersionId != null
              ? processorNames.get(s.processorVersionId)
              : undefined;
        return (
          <span className="text-muted-foreground block max-w-[220px] truncate text-xs">
            {target ??
              (s.kind === 'Chain' ? 'Unknown chain' : 'Unknown processor')}
          </span>
        );
      },
    },
    {
      accessorKey: 'cronExpression',
      header: 'Recurrence',
      enableSorting: false,
      cell: ({ row }) => {
        const described = describeCron(row.original.cronExpression);
        return (
          <span className="flex items-center gap-1.5 text-xs">
            {described.ok ? described.text : row.original.cronExpression}
            {row.original.lastError ? (
              <span
                title={row.original.lastError}
                className="inline-flex"
                aria-label="Last run failed"
              >
                <AlertCircleIcon className="text-destructive size-3.5 shrink-0" />
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      accessorKey: 'nextRunAt',
      header: 'Next run',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.nextRunAt
            ? formatDistanceToNow(new Date(row.original.nextRunAt), {
                addSuffix: true,
              })
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Enabled',
      cell: ({ row }) => (
        <div onClick={stop} className="w-fit">
          <Switch
            checked={row.original.enabled}
            aria-label={`${row.original.enabled ? 'Disable' : 'Enable'} schedule ${row.original.name}`}
            onCheckedChange={(enabled) => onToggle(row.original.id, enabled)}
          />
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <RowActions
            label={`Actions for schedule ${s.name}`}
            actions={[
              { label: 'Edit', icon: PencilIcon, onSelect: () => onEdit(s.id) },
              {
                label: 'Delete',
                icon: Trash2Icon,
                variant: 'destructive',
                separatorBefore: true,
                onSelect: () => onDelete(s.id),
                confirm: {
                  title: 'Delete schedule?',
                  description: `"${s.name}" will be removed permanently. This cannot be undone.`,
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
