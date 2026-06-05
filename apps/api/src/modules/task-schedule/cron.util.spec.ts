import { computeNextRun, isValidCron } from './cron.util';

describe('cron.util', () => {
  describe('isValidCron', () => {
    it('accepts a valid expression', () => {
      expect(isValidCron('0 0 * * *')).toBe(true);
    });
    it('rejects garbage', () => {
      expect(isValidCron('not a cron')).toBe(false);
    });
  });

  describe('computeNextRun', () => {
    it('returns the next midnight after the given instant (UTC)', () => {
      const from = new Date('2026-05-21T10:00:00.000Z');
      const next = computeNextRun('0 0 * * *', 'UTC', from);
      expect(next.toISOString()).toBe('2026-05-22T00:00:00.000Z');
    });

    it('honours the timezone', () => {
      const from = new Date('2026-05-21T10:00:00.000Z');
      // midnight in Europe/Paris (UTC+2 in May) === 22:00 UTC the day before
      const next = computeNextRun('0 0 * * *', 'Europe/Paris', from);
      expect(next.toISOString()).toBe('2026-05-21T22:00:00.000Z');
    });

    it('throws on an invalid expression', () => {
      expect(() => computeNextRun('nope', 'UTC', new Date())).toThrow();
    });
  });
});
