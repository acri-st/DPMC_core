import type { Host as ApiHost } from '@dpmc/client';

export type Host = Omit<
  ApiHost,
  'ram' | 'disk' | 'lastHeartbeatAt' | 'createdAt' | 'updatedAt'
> & {
  ram: number;
  disk: number;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
};
