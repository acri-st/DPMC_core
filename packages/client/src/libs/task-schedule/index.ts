import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const taskSchedule = c.router({
  list: $.ListTaskScheduleRoute,
  get: $.GetTaskScheduleRoute,
  create: $.CreateTaskScheduleRoute,
  update: $.UpdateTaskScheduleRoute,
  delete: $.DeleteTaskScheduleRoute,
});
