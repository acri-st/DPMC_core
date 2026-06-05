import type { ReactNode } from 'react';

import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils';

type SearchConfig = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

type PageToolbarProps = {
  /** Optional search input config. When provided an <Input> is rendered. */
  search?: SearchConfig;
  /** Additional controls (Selects, ViewModeToggle, etc.). All should be h-8 by default. */
  children?: ReactNode;
  className?: string;
};

/**
 * Toolbar row that lives between the PageHeader and the data table.
 * All controls are aligned to the same height (h-8 = shadcn/ui defaults for
 * Input and SelectTrigger without an explicit size prop).
 *
 * Usage:
 *   <PageToolbar
 *     search={{ value: q, onChange: setQ, placeholder: "Search…" }}
 *   >
 *     <Select …><SelectTrigger className="w-40">…</SelectTrigger>…</Select>
 *   </PageToolbar>
 */
export function PageToolbar({ search, children, className }: PageToolbarProps) {
  if (!search && !children) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {search ? (
        <Input
          type="search"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder ?? 'Search…'}
          className="max-w-sm"
        />
      ) : null}
      {children}
    </div>
  );
}
