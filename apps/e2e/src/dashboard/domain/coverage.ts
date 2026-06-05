export interface RequirementDefinition {
  id: string;
  label: string;
  tests: string[];
}

export interface TestDefinition {
  id: string;
  file: string;
}

export type TestRunStatus = 'passed' | 'failed' | 'skipped';

export interface TestRunResult {
  status: TestRunStatus;
}

export interface CoveredTest {
  id: string;
  status: 'passed' | 'failed' | 'skipped' | 'missing';
}

export interface RequirementCoverage {
  id: string;
  label: string;
  passed: number;
  failed: number;
  skipped: number;
  missing: number;
  tests: CoveredTest[];
}

export interface ComputeCoverageInput {
  requirements: RequirementDefinition[];
  testsById: Map<string, TestDefinition>;
  resultsByTestId: Map<string, TestRunResult>;
}

export function computeCoverage({
  requirements,
  testsById,
  resultsByTestId,
}: ComputeCoverageInput): RequirementCoverage[] {
  return requirements.map((requirement) => {
    const tests = requirement.tests.map<CoveredTest>((testId) => {
      if (!testsById.has(testId)) {
        return { id: testId, status: 'missing' };
      }

      const result = resultsByTestId.get(testId);
      if (result?.status === 'passed') {
        return { id: testId, status: 'passed' };
      }
      if (result?.status === 'failed') {
        return { id: testId, status: 'failed' };
      }
      if (result?.status === 'skipped') {
        return { id: testId, status: 'skipped' };
      }

      return { id: testId, status: 'missing' };
    });

    const total = tests.length;
    if (total === 0) {
      return {
        id: requirement.id,
        label: requirement.label,
        passed: 0,
        failed: 0,
        skipped: 0,
        missing: 100,
        tests,
      };
    }

    const passedCount = tests.filter((test) => test.status === 'passed').length;
    const failedCount = tests.filter((test) => test.status === 'failed').length;
    const skippedCount = tests.filter((test) => test.status === 'skipped').length;
    const passed = Math.round((passedCount / total) * 100);
    const failed = Math.round((failedCount / total) * 100);
    const skipped = Math.round((skippedCount / total) * 100);
    const missing = Math.max(0, 100 - passed - failed - skipped);

    return {
      id: requirement.id,
      label: requirement.label,
      passed,
      failed,
      skipped,
      missing,
      tests,
    };
  });
}
