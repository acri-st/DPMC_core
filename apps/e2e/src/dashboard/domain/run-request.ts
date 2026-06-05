import type { RunScope } from './commands.ts';

export function buildRunRequestBody(scope: RunScope) {
  return { scope };
}
