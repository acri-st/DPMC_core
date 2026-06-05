import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const task = c.router({
  list: $.ListTaskRoute,
  get: $.GetTaskRoute,
  create: $.CreateTaskRoute,
  update: $.UpdateTaskRoute,
  delete: $.DeleteTaskRoute,
  trigger: $.TriggerTaskRoute,
});
