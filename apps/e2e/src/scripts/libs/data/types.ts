import type { Requirement } from '../../../constants/requirements';

export interface TestTag {
  file: string;
  testName: string;
  describePath: string[];
  requirementIds: string[];
  planIds: string[];
  isTodo: boolean;
  // `it.skip`, or any `it` nested under a `describe.skip`. Never executes, so
  // it must not be credited as covering its requirement.
  isSkipped: boolean;
}

export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  file: string;
  filePath: string;
  testName: string;
  describePath: string[];
  status: TestStatus;
}

export interface CoveredRequirement {
  requirement: Requirement;
  tests: TestTag[];
}

export interface EvolutionCoverage {
  evolution: string;
  requirements: CoveredRequirement[];
}

export interface CoverageReport {
  totals: { total: number; covered: number; notCovered: number };
  evolutions: EvolutionCoverage[];
}

// Jest JSON input shape (partial — only the fields we consume)
export interface JestAssertion {
  title: string;
  ancestorTitles: string[];
  status: string;
}

export interface JestSuite {
  name: string;
  assertionResults: JestAssertion[];
}

export interface JestResults {
  testResults: JestSuite[];
}

// JSON artifact output shape
export interface TestStep {
  name: string;
  coveredRequirements: Array<{ id: string; success: boolean }>;
}

export interface CoverageArtifact {
  id: number;
  testCase: string;
  path: string;
  tests: TestStep[];
}

// Plan coverage (TXX.Y test cases extracted from test-plan.docx)
export type PlanStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'todo'
  | 'untagged';

export interface PlanCoverageEntry {
  testCase: import('../../../constants/test-cases').TestCase;
  tests: TestTag[];
  status: PlanStatus;
}

export interface PlanSectionCoverage {
  section: string;
  title: string;
  entries: PlanCoverageEntry[];
}

export interface PlanCoverageReport {
  totals: {
    total: number;
    implemented: number;
    passed: number;
    failed: number;
    todo: number;
    blocked: number;
  };
  sections: PlanSectionCoverage[];
}
