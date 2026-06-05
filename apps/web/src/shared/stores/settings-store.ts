import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cookieStorage } from '@/shared/stores/cookie-storage';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type ContainerSize = 'constrained' | 'full';

type SettingsState = {
  theme: ThemeSetting;
  containerSize: ContainerSize;
  setTheme: (theme: ThemeSetting) => void;
  setContainerSize: (size: ContainerSize) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      containerSize: 'constrained',
      setTheme: (theme) => set({ theme }),
      setContainerSize: (containerSize) => set({ containerSize }),
    }),
    {
      name: 'dpmc.settings',
      storage: createJSONStorage(() => cookieStorage),
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        containerSize: state.containerSize,
      }),
    },
  ),
);
