// Deterministic UUIDs for fixtures inserted by seed.run().
// Tests import these constants instead of querying the DB.

export const FIXTURES = {
  dataCenter: {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'TST',
    name: 'Test Data Center',
  },
  project: {
    id: '00000000-0000-0000-0000-000000000002',
    identifier: 'test',
    name: 'Test Project',
  },
  pool: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'DevelopmentPool1',
  },
  processingScript: {
    id: '00000000-0000-0000-0000-000000000004',
    acronym: 'imagemagick-resize',
    name: 'ImageMagick Resize',
  },
  processingScriptVersion: {
    id: '00000000-0000-0000-0000-000000000005',
    version: '1.0',
  },
  processingScriptExecutable: {
    id: '00000000-0000-0000-0000-000000000006',
  },
  auxiliaryConfiguration: {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'e2e-aux-config',
    baseline: '1.0',
  },
  processorVersion: {
    id: '00000000-0000-0000-0000-000000000008',
    baseline: '1.0',
  },
} as const;
