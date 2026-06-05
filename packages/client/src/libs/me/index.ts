import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const me = c.router({
  getSettings: $.GetMeSettingsRoute,
  patchSettings: $.PatchMeSettingsRoute,
});
