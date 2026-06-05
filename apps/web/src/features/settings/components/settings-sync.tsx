import { useSettingsSync } from '@/features/settings/hooks/use-settings-sync';

export function SettingsSync() {
  useSettingsSync();
  return null;
}
