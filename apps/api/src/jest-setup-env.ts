/**
 * Default env for Jest when `.env` is not loaded.
 * Keeps `ConfigService.validate` happy for suites that import Nest modules.
 */
if (!process.env.WORKER_REGISTRATION_TOKEN) {
  process.env.WORKER_REGISTRATION_TOKEN =
    'jest-worker-registration-token-min20chars';
}
if (
  !process.env.SESSION_ENCRYPTION_KEY ||
  process.env.SESSION_ENCRYPTION_KEY.length < 40
) {
  process.env.SESSION_ENCRYPTION_KEY =
    'jest-session-encryption-key-with-min-40-chars-padding';
}
