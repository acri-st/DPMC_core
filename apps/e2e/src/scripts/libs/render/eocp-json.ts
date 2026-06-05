import type { CoverageArtifact, TestResult, TestTag } from '../data/types';

export function renderEocpJson(tags: TestTag[], results: TestResult[]) {
  const tagIndex = new Map(
    tags.map((t) => [testKey(t.file, t.testName), t.requirementIds]),
  );

  const groups = new Map<string, CoverageArtifact>();
  let nextId = 1;

  for (const result of results) {
    const requirementIds = tagIndex.get(testKey(result.file, result.testName));
    if (!requirementIds) continue;

    const describe = result.describePath.join(' › ') || result.file;
    const key = `${result.file}::${describe}`;
    const success = result.status === 'passed';

    let group = groups.get(key);
    if (!group) {
      group = {
        id: nextId++,
        testCase: describe,
        path: result.filePath,
        tests: [],
      };
      groups.set(key, group);
    }

    group.tests.push({
      name: result.testName,
      coveredRequirements: requirementIds.map((id) => ({ id, success })),
    });
  }

  return [...groups.values()];
}

function testKey(file: string, testName: string) {
  return `${file}::${testName}`;
}
