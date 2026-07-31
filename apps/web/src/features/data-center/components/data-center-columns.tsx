import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { RowActions } from '@/shared/components/row-actions';
import type { DataCenter } from '@/features/data-center/services/data-center.service';

type DataCenterColumnsOptions = {
  onView: (id: number) => void;
};

export function buildDataCenterColumns({
  onView,
}: DataCenterColumnsOptions): ColumnDef<DataCenter>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.code}
        </Badge>
      ),
    },
    {
      accessorKey: 'latitude',
      header: 'Latitude',
      cell: ({ row }) => row.original.latitude.toFixed(4),
    },
    {
      accessorKey: 'longitude',
      header: 'Longitude',
      cell: ({ row }) => row.original.longitude.toFixed(4),
    },
    {
      accessorKey: 'pue',
      header: 'PUE',
      cell: ({ row }) => row.original.pue.toFixed(2),
    },
    {
      accessorKey: 'emissionFactor',
      header: 'Emission (g/kWh)',
      cell: ({ row }) => row.original.emissionFactor.toString(),
    },
    {
      accessorKey: 'energyIntensity',
      header: 'Energy (kWh/Go)',
      cell: ({ row }) => row.original.energyIntensity.toString(),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          label={`Actions for data center ${row.original.name}`}
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
