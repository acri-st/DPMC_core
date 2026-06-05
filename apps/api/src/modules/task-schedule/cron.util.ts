import { parseExpression } from 'cron-parser';

/**
 * Thin wrapper around cron-parser so the rest of the codebase never imports it
 * directly — if the library's API changes, only this file changes.
 */
export function isValidCron(expression: string): boolean {
  try {
    parseExpression(expression, { tz: 'UTC' });
    return true;
  } catch {
    return false;
  }
}

export function computeNextRun(
  expression: string,
  timezone: string,
  from: Date,
): Date {
  const interval = parseExpression(expression, {
    tz: timezone,
    currentDate: from,
  });
  return interval.next().toDate();
}
