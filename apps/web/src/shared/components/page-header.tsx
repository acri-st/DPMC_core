import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
  noun?: string;
  /** Override plural form when "${noun}s" is incorrect (e.g. batch → batches). */
  nounPlural?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared page-level header used by every list page.
 *
 * Left side:  icon + title (text-xl font-semibold) + optional subtitle.
 * Center-ish: optional count badge (font-mono secondary).
 * Right side: action slot (Refresh button, ViewModeToggle, primary action, …).
 *
 * All right-side controls should use size="sm" so they share the same height.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  count,
  noun,
  nounPlural,
  className,
  children,
}: PageHeaderProps) {
  const countLabel =
    count !== undefined
      ? noun
        ? `${count.toLocaleString()} ${count === 1 ? noun : (nounPlural ?? `${noun}s`)}`
        : count.toLocaleString()
      : null;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Icon className="size-5 shrink-0" />
          {title}
        </h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {countLabel !== null ? (
          <Badge variant="secondary" className="font-mono">
            {countLabel}
          </Badge>
        ) : null}
        {children}
      </div>
    </div>
  );
}
