import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CreateTaskScheduleBody,
  UpdateTaskScheduleBody,
} from '@dpmc/client';
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from '@/features/schedule/services/schedule.service';

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskScheduleBody) => createSchedule(body),
    onSuccess: () => {
      toast.success('Schedule created');
      void qc.invalidateQueries({ queryKey: ['task-schedule'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; body: UpdateTaskScheduleBody }) =>
      updateSchedule(vars.id, vars.body),
    onSuccess: () => {
      toast.success('Schedule updated');
      void qc.invalidateQueries({ queryKey: ['task-schedule'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSchedule(id),
    onSuccess: () => {
      toast.success('Schedule deleted');
      void qc.invalidateQueries({ queryKey: ['task-schedule'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
