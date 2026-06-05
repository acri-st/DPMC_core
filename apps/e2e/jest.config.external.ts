import type { Config } from 'jest';

// Runs tests against a pre-started e2e stack (e.g. the dashboard env).
// No globalSetup/globalTeardown — assumes Docker + API + Keycloak are already up.
// Usage: E2E_EXTERNAL=1 jest --config jest.config.external.ts --testPathPattern=t01
const config: Config = {
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  setupFiles: ['<rootDir>/src/setup/setup-files.ts'],
  testTimeout: 30_000,
  maxWorkers: 1,
  // Suppress "at fmt (test-logger.ts:xx)" stack lines after every console.log
  verbose: false,
  silent: false,
};

export default config;
