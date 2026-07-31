import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { InfoIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils';

type SearchConfig = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

type ListHeaderProps = {
  icon: LucideIcon;
  title: string;
  /** Moved into an ⓘ tooltip to save a vertical line. */
  subtitle?: string;
  count?: number;
  noun?: string;
  nounPlural?: string;
  search?: SearchConfig;
  /** FacetedFilter elements. */
  filters?: ReactNode;
  /** Refresh / primary action / ViewModeToggle — all size="sm". */
  actions?: ReactNode;
  className?: string;
};

/**
 * Single compact control row for every list page:
 *   [icon · title · ⓘ · count]  ⇢  [search] [filters…] [actions]
 * Replaces the former PageHeader + PageToolbar two-row layout.
 *
 * Relies on the global `TooltipProvider` wrapping the dashboard layout
 * (see `features/layout/components/dashboard-layout.tsx`); no local
 * provider is added here.
 */
export function ListHeader({
  icon: Icon,
  title,
  subtitle,
  count,
  noun,
  nounPlural,
  search,
  filters,
  actions,
  className,
}: ListHeaderProps) {
  const countLabel =
    count !== undefined
      ? noun
        ? `${count.toLocaleString()} ${count === 1 ? noun : (nounPlural ?? `${noun}s`)}`
        : count.toLocaleString()
      : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-1.5 text-base font-semibold">
          <Icon className="size-4 shrink-0" />
          {title}
        </h1>
        {subtitle ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{subtitle}</TooltipContent>
          </Tooltip>
        ) : null}
        {countLabel !== null ? (
          <Badge variant="secondary" className="font-mono">
            {countLabel}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {search ? (
          <Input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Search…'}
            className="h-8 w-full sm:w-56"
          />
        ) : null}
        {filters}
        {actions}
      </div>
    </div>
  );
}
