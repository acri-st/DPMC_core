import type { ApiStatus } from '@dpmc/client';

import { apiFetch } from '@/shared/libs/api-client';

interface StatusResponse {
  status: number;
  data: ApiStatus;
}

export async function getApiStatus() {
  const res = await apiFetch<StatusResponse>('/status');
  return res.data;
}
