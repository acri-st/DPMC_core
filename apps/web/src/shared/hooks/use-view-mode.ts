import { useCallback, useEffect, useState } from 'react';

import type { ViewMode } from '@/shared/components/view-mode-toggle';

const STORAGE_PREFIX = 'dpmc.view-mode.';

export function useViewMode(key: string, initial: ViewMode = 'list') {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return initial;
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'list' || stored === 'table' ? stored : initial;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, mode);
  }, [storageKey, mode]);

  const update = useCallback((next: ViewMode) => {
    setMode(next);
  }, []);

  return [mode, update] as const;
}
