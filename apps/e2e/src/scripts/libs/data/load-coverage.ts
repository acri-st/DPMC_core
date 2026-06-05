import { existsSync } from 'node:fs';
import { parseJestResults } from './parse-jest';
import { scanTags } from './scan-tags';
import type { TestResult, TestTag } from './types';

export interface CoverageData {
  tags: TestTag[];
  results: TestResult[] | null;
}

/**
 * Walks `testsDir` for @plan / @covers tags and, when a jest results file
 * exists at `jestResultsFile`, parses its assertions. Returns both pieces
 * already wired together for the report builders.
 */
export function loadCoverage(
  testsDir: string,
  jestResultsFile: string,
  rootDir: string,
): CoverageData {
  const tags = scanTags(testsDir);
  const results = existsSync(jestResultsFile)
    ? parseJestResults(jestResultsFile, rootDir)
    : null;
  return { tags, results };
}
