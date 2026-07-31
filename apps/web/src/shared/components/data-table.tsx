import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/utils';

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  rowClassName?: string;
  // Controlled server-side sorting: when both are provided the table stops
  // sorting rows itself and just reports header clicks upward (the parent
  // re-fetches ordered data). Omit both for the default client-side sort.
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
};

export function DataTable<TData>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No results.',
  rowClassName,
  sorting: controlledSorting,
  onSortingChange,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const manualSorting =
    controlledSorting !== undefined && Boolean(onSortingChange);
  const sorting = controlledSorting ?? internalSorting;

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: onSortingChange ?? setInternalSorting,
    manualSorting,
    getCoreRowModel: getCoreRowModel(),
    // Server sorts the rows in manual mode; only sort client-side otherwise.
    ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
  });

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow
              key={group.id}
              className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10"
            >
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'text-muted-foreground h-8 py-0 text-xs font-medium uppercase tracking-wide',
                      sortable && 'cursor-pointer select-none',
                    )}
                    onClick={
                      sortable
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sortable ? (
                          sortDir === 'asc' ? (
                            <ArrowUpIcon className="size-3" />
                          ) : sortDir === 'desc' ? (
                            <ArrowDownIcon className="size-3" />
                          ) : (
                            <ArrowUpDownIcon className="size-3 opacity-40" />
                          )
                        ) : null}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground py-8 text-center text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && 'cursor-pointer', rowClassName)}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-1.5 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
