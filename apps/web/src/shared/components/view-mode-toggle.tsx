import { LayoutListIcon, TableIcon } from 'lucide-react';

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/shared/components/ui/toggle-group';

export type ViewMode = 'list' | 'table';

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={value}
      onValueChange={(next) => {
        if (next === 'list' || next === 'table') onChange(next);
      }}
      aria-label="View mode"
    >
      <ToggleGroupItem value="list" aria-label="List view">
        <LayoutListIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table view">
        <TableIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
