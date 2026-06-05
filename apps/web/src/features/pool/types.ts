import type { Pool } from '@dpmc/client';
import type { Host } from '@/features/host/types';

export type PoolDetailFE = Pool & { hosts: Host[] };
