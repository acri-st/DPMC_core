import type { LucideIcon } from 'lucide-react';
import { CheckIcon, ListFilterIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { cn } from '@/shared/utils';

export type FacetOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

type FacetedFilterProps = {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
};

export function FacetedFilter({
  label,
  options,
  selected,
  onChange,
}: FacetedFilterProps) {
  const selectedSet = new Set(selected);

  const toggle = (value: string) => {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange([...next]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <ListFilterIcon className="size-3.5" />
          {label}
          {selected.length > 0 ? (
            <Badge
              variant="secondary"
              className="ml-1 rounded-sm px-1 font-mono text-xs"
            >
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={label} />
          <CommandList>
            <CommandEmpty>No option.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const active = selectedSet.has(option.value);
                const Icon = option.icon;
                return (
                  <CommandItem
                    key={option.value}
                    role="option"
                    aria-selected={active}
                    onSelect={() => toggle(option.value)}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border',
                        active
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      <CheckIcon
                        className={cn('size-3', !active && 'opacity-0')}
                      />
                    </div>
                    {Icon ? <Icon className="size-3.5" /> : null}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
