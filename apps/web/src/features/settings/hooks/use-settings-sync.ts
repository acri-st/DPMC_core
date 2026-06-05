import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  fetchMeSettings,
  patchMeSettings,
} from '@/features/settings/services/settings.service';
import { useSettingsStore } from '@/shared/stores/settings-store';

const PATCH_DEBOUNCE_MS = 500;

export function useSettingsSync() {
  const { status, data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const hydratedForUserRef = useRef<number | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) On login, hydrate the local store from the server (server wins).
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    if (hydratedForUserRef.current === user.id) return;
    hydratedForUserRef.current = user.id;

    queryClient
      .fetchQuery({ queryKey: ['me', 'settings'], queryFn: fetchMeSettings })
      .then((settings) => {
        useSettingsStore.setState({
          theme: settings.theme,
          containerSize: settings.containerSize,
        });
      })
      .catch(() => {
        // ignore — keep cookie cache
      });
  }, [status, user, queryClient]);

  // 2) Watch store mutations and PATCH the server (debounced) while logged in.
  useEffect(() => {
    let last = {
      theme: useSettingsStore.getState().theme,
      containerSize: useSettingsStore.getState().containerSize,
    };
    const unsubscribe = useSettingsStore.subscribe((state) => {
      if (
        state.theme === last.theme &&
        state.containerSize === last.containerSize
      ) {
        return;
      }
      last = { theme: state.theme, containerSize: state.containerSize };
      // Skip until first hydration, otherwise we'd race with the GET.
      if (hydratedForUserRef.current === null) return;

      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        patchMeSettings(last).catch(() => undefined);
      }, PATCH_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  // 3) Reset hydration flag on logout so the next login re-hydrates.
  useEffect(() => {
    if (status === 'unauthenticated') {
      hydratedForUserRef.current = null;
    }
  }, [status]);
}
