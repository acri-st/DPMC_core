import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  globalSetup: '<rootDir>/src/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/setup/global-teardown.ts',
  setupFiles: ['<rootDir>/src/setup/setup-files.ts'],
  testTimeout: 30_000,
  maxWorkers: 1,
};

export default config;
