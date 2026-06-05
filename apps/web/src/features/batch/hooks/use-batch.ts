import { useQuery } from '@tanstack/react-query';

import {
  getBatch,
  listBatchInputs,
  listBatchJobs,
  listBatchLogs,
  listBatchProducts,
  type BatchJobView,
  type InputView,
  type ListBatchLogsResult,
  type ProductView,
} from '@/features/batch/services/batch.service';
import type { Batch } from '@/features/batch/types';

export function useBatch(id: number) {
  return useQuery<Batch>({
    queryKey: ['batch', id],
    queryFn: () => getBatch(id),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

export function useBatchJobs(id: number) {
  return useQuery<BatchJobView[]>({
    queryKey: ['batch', id, 'jobs'],
    queryFn: () => listBatchJobs(id),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

export function useBatchProducts(id: number) {
  return useQuery<ProductView[]>({
    queryKey: ['batch', id, 'products'],
    queryFn: () => listBatchProducts(id),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

export function useBatchInputs(id: number) {
  return useQuery<InputView[]>({
    queryKey: ['batch', id, 'inputs'],
    queryFn: () => listBatchInputs(id),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

export function useBatchLogs(id: number) {
  return useQuery<ListBatchLogsResult>({
    queryKey: ['batch', id, 'logs'],
    queryFn: () => listBatchLogs(id, { limit: 200 }),
    enabled: Boolean(id),
    refetchInterval: 3_000,
  });
}
