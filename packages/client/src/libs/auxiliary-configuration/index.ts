import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const auxiliaryConfiguration = c.router({
  list: $.ListAuxiliaryConfigurationRoute,
  get: $.GetAuxiliaryConfigurationRoute,
  create: $.CreateAuxiliaryConfigurationRoute,
  update: $.UpdateAuxiliaryConfigurationRoute,
  delete: $.DeleteAuxiliaryConfigurationRoute,
});
