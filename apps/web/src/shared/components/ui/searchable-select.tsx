'use client';

import { cn } from '@/shared/utils';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/shared/components/ui/combobox';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  value: SearchableSelectOption | null;
  onValueChange: (value: SearchableSelectOption | null) => void;
  items: SearchableSelectOption[];
  /**
   * Called with the typed query so the caller can filter server-side.
   * The component itself does not filter (`filter={null}`).
   */
  onSearchChange?: (query: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A select whose options are searched server-side. Built on the Base UI
 * Combobox: built-in filtering is disabled, the caller feeds already-filtered
 * `items` and reacts to `onSearchChange`. Use for lists too large to render in
 * full (thousands of datasets, products, …).
 */
export function SearchableSelect({
  value,
  onValueChange,
  items,
  onSearchChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  loading = false,
  disabled = false,
  className,
}: SearchableSelectProps) {
  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(v) =>
        onValueChange((v as SearchableSelectOption | null) ?? null)
      }
      onInputValueChange={(input) => onSearchChange?.(input)}
      isItemEqualToValue={(a, b) =>
        (a as SearchableSelectOption | null)?.value ===
        (b as SearchableSelectOption | null)?.value
      }
      filter={null}
    >
      <ComboboxTrigger
        disabled={disabled}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-popup-open:border-ring dark:bg-input/30 dark:hover:bg-input/50',
          className,
        )}
      >
        <ComboboxValue>
          {(selected: SearchableSelectOption | null) =>
            selected ? (
              <span className="line-clamp-1">{selected.label}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          }
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder={searchPlaceholder} showTrigger={false} />
        <ComboboxEmpty>{loading ? 'Loading…' : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchableSelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              <span className="line-clamp-1">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
