import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const project = c.router({
  list: $.ListProjectRoute,
  get: $.GetProjectRoute,
  create: $.CreateProjectRoute,
  update: $.UpdateProjectRoute,
  delete: $.DeleteProjectRoute,
  setDefault: $.SetDefaultProjectRoute,
});
