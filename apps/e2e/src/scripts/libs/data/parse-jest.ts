import { readFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import type { JestResults, TestStatus } from './types';

export function parseJestResults(resultsFile: string, rootDir: string) {
  const raw = JSON.parse(readFileSync(resultsFile, 'utf-8')) as JestResults;
  return raw.testResults.flatMap((suite) => {
    const file = basename(suite.name);
    const filePath = relative(rootDir, suite.name);
    return suite.assertionResults.map((a) => ({
      file,
      filePath,
      testName: a.title,
      describePath: a.ancestorTitles,
      status: normalizeStatus(a.status),
    }));
  });
}

function normalizeStatus(status: string): TestStatus {
  if (status === 'passed' || status === 'failed') return status;
  return 'skipped';
}
