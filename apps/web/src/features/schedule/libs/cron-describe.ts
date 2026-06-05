import cronstrue from 'cronstrue';

/**
 * Returns an English human-readable description of a cron expression, or an
 * error string if the expression is invalid. Used for the live preview under
 * the custom-cron input.
 */
export function describeCron(
  expression: string,
): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const text = cronstrue.toString(expression, {
      throwExceptionOnParseError: true,
      use24HourTimeFormat: true,
    });
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid' };
  }
}
