import { useEffect } from 'react';

import {
  useSettingsStore,
  type ThemeSetting,
} from '@/shared/stores/settings-store';

function resolveTheme(theme: ThemeSetting): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

function apply(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    apply(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply(resolveTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return null;
}

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((s) => s.theme);
  return resolveTheme(theme);
}
