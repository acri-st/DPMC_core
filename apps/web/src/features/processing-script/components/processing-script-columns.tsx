import type { ColumnDef } from '@tanstack/react-table';
import type { ProcessingScriptListItem } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';

export function buildProcessingScriptColumns(): ColumnDef<ProcessingScriptListItem>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'acronym',
      header: 'Acronym',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.acronym}
        </Badge>
      ),
    },
    {
      accessorKey: 'defaultVersion',
      header: 'Default version',
      cell: ({ row }) => {
        const v = row.original.defaultVersion;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant="secondary" className="font-mono">
            {v.version}
          </Badge>
        );
      },
    },
  ];
}
