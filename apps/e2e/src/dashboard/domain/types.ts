import type { RequirementCoverage, RequirementDefinition } from './coverage.ts';

export interface TestCatalogFile {
  tests: TestDefinitionEntry[];
}

export interface TestDefinitionEntry {
  id: string;
  name: string;
  file: string;
  selector: string;
  requirements: string[];
}

export interface RequirementsFile {
  requirements: RequirementDefinition[];
}

export interface DashboardSnapshot {
  running: boolean;
  catalog: TestDefinitionEntry[];
  requirements: RequirementDefinition[];
  coverage: RequirementCoverage[];
  lastRun: RunArtifact | null;
}

export interface RunRequest {
  scope: {
    type: 'all' | 'file' | 'files' | 'test';
    value?: string;
    values?: string[];
  };
}

export interface RunArtifact {
  status: 'passed' | 'failed' | 'skipped';
  startedAt: string;
  finishedAt: string;
  scope: {
    type: 'all' | 'file' | 'files' | 'test';
    value?: string;
    values?: string[];
  };
  command: string[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
  };
  tests: Array<{
    id: string;
    file: string;
    selector: string;
    status: 'passed' | 'failed' | 'skipped';
    durationMs: number;
    error?: {
      message: string;
      stack?: string;
    };
  }>;
  stdout: string;
  stderr: string;
}
