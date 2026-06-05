import type { ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';

import { cn } from '@/shared/utils';
import { useSettingsStore } from '@/shared/stores/settings-store';

type PageContainerProps = {
  children: ReactNode;
};

/**
 * Routes that always render full width regardless of the user's container
 * preference (e.g. graph editors that need the canvas to breathe).
 */
const FULL_WIDTH_PATTERNS: RegExp[] = [/^\/production-chain\/[^/]+$/];

export function PageContainer({ children }: PageContainerProps) {
  const containerSize = useSettingsStore((s) => s.containerSize);
  const { pathname } = useLocation();
  const forcedFullWidth = FULL_WIDTH_PATTERNS.some((p) => p.test(pathname));
  return (
    <div
      className={cn(
        'flex w-full flex-1 flex-col gap-4',
        !forcedFullWidth &&
          containerSize === 'constrained' &&
          'mx-auto max-w-6xl',
      )}
    >
      {children}
    </div>
  );
}
