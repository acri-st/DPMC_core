// Deterministic UUIDs for fixtures inserted by seed.run().
// Tests import these constants instead of querying the DB.

export const FIXTURES = {
  dataCenter: {
    id: 1,
    code: 'TST',
    name: 'Test Data Center',
  },
  project: {
    id: 2,
    identifier: 'test',
    name: 'Test Project',
  },
  pool: {
    id: 3,
    name: 'DevelopmentPool1',
  },
  processingScript: {
    id: 4,
    acronym: 'imagemagick-resize',
    name: 'ImageMagick Resize',
  },
  processingScriptVersion: {
    id: 5,
    version: '1.0',
  },
  processingScriptExecutable: {
    id: 6,
  },
  auxiliaryConfiguration: {
    id: 7,
    name: 'e2e-aux-config',
    baseline: '1.0',
  },
  processorVersion: {
    id: 8,
    baseline: '1.0',
  },
} as const;
