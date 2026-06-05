import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import {
  listJobs,
  type ListJobsParams,
} from '@/features/job/services/job.service';

export const jobListKey = (params: ListJobsParams, projectId: number | null) =>
  [
    'job',
    'list',
    projectId,
    params.page,
    params.pageSize,
    params.q ?? '',
    params.status ?? '',
  ] as const;

export function useJobList(params: ListJobsParams) {
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const projectId = project.data?.id ?? null;
  return useQuery({
    queryKey: jobListKey(params, projectId),
    queryFn: () => listJobs(params),
    enabled: status === 'authenticated' && Boolean(project.data),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}
