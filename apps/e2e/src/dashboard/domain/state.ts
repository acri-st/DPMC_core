import { computeCoverage, type RequirementDefinition, type RequirementCoverage } from './coverage.ts';
import type { RunArtifact, TestDefinitionEntry } from './types.ts';

export function buildCoverageState(params: {
  requirements: RequirementDefinition[];
  catalog: TestDefinitionEntry[];
  lastRun: RunArtifact | null;
}): RequirementCoverage[] {
  const testsById = new Map<string, TestDefinitionEntry>(
    params.catalog.map((test) => [test.id, test] as const),
  );
  const STATUS_RANK: Record<string, number> = { failed: 2, skipped: 1, passed: 0 };
  const resultsByTestId = new Map<string, { status: 'passed' | 'failed' | 'skipped' }>();
  for (const test of params.lastRun?.tests ?? []) {
    const existing = resultsByTestId.get(test.id);
    if (!existing || STATUS_RANK[test.status] > STATUS_RANK[existing.status]) {
      resultsByTestId.set(test.id, { status: test.status });
    }
  }

  return computeCoverage({
    requirements: params.requirements.map((requirement) => ({
      id: requirement.id,
      label: requirement.label,
      tests: requirement.tests,
    })),
    testsById,
    resultsByTestId,
  });
}
