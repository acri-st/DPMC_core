import { SECTION_TITLES, TEST_CASES } from '../../../constants/test-cases';
import type {
  PlanCoverageEntry,
  PlanCoverageReport,
  PlanSectionCoverage,
  PlanStatus,
  TestResult,
  TestStatus,
  TestTag,
} from '../data/types';

export function buildPlanReport(
  tags: TestTag[],
  results: TestResult[] | null,
): PlanCoverageReport {
  const tagsByPlanId = indexTagsByPlanId(tags);
  const statusesByPlanId = indexStatusesByPlanId(results);
  const hasResults = results !== null;

  const bySection = new Map<string, PlanCoverageEntry[]>();
  for (const testCase of TEST_CASES) {
    const tagsForCase = tagsByPlanId.get(testCase.id) ?? [];
    const status = pickStatus(
      tagsForCase,
      statusesByPlanId.get(testCase.id) ?? [],
      hasResults,
    );
    const bucket = bySection.get(testCase.section) ?? [];
    bucket.push({ testCase, tests: tagsForCase, status });
    bySection.set(testCase.section, bucket);
  }

  const sections: PlanSectionCoverage[] = [...bySection.entries()]
    .sort(([a], [b]) => sectionNumber(a) - sectionNumber(b))
    .map(([section, entries]) => ({
      section,
      title: SECTION_TITLES[section] ?? section,
      entries,
    }));

  const flat = sections.flatMap((s) => s.entries);
  const passed = flat.filter((e) => e.status === 'passed').length;
  const failed = flat.filter((e) => e.status === 'failed').length;
  const skipped = flat.filter((e) => e.status === 'skipped').length;
  const todo = flat.filter((e) => e.status === 'todo').length;
  const blocked = flat.filter(
    (e) => e.status === 'todo' && e.testCase.blocker,
  ).length;
  const implemented = flat.length - todo;

  return {
    totals: {
      total: flat.length,
      implemented,
      passed,
      failed,
      todo: todo + skipped,
      blocked,
    },
    sections,
  };
}

function indexTagsByPlanId(tags: TestTag[]) {
  const index = new Map<string, TestTag[]>();
  for (const tag of tags) {
    for (const id of tag.planIds) {
      const bucket = index.get(id) ?? [];
      bucket.push(tag);
      index.set(id, bucket);
    }
  }
  return index;
}

const PLAN_ID_RE = /T\d+\.\d+[a-z]?/g;

// Matching jest assertions to plan IDs by literal test title breaks for
// `test.each` (the source has '%s …' but jest expands to 'admin …'). We pull
// the plan ID from the assertion's `describePath` instead — every spec wraps
// its tests in `describe('TXX.Y — …')`.
function indexStatusesByPlanId(results: TestResult[] | null) {
  const map = new Map<string, TestStatus[]>();
  if (!results) return map;
  for (const r of results) {
    const ids = new Set<string>();
    for (const segment of r.describePath) {
      const matches = segment.match(PLAN_ID_RE);
      if (matches) for (const m of matches) ids.add(m);
    }
    for (const id of ids) {
      const arr = map.get(id) ?? [];
      arr.push(r.status);
      map.set(id, arr);
    }
  }
  return map;
}

function pickStatus(
  tags: TestTag[],
  statuses: TestStatus[],
  hasResults: boolean,
): PlanStatus {
  if (tags.length === 0) return 'todo';
  const realTags = tags.filter((t) => !t.isTodo);
  if (realTags.length === 0) return 'todo';
  if (!hasResults) return 'untagged';
  if (statuses.length === 0) return 'untagged';
  if (statuses.includes('failed')) return 'failed';
  if (statuses.every((s) => s === 'passed')) return 'passed';
  if (statuses.every((s) => s === 'skipped')) return 'skipped';
  return 'passed';
}

function sectionNumber(section: string) {
  return Number(section.slice(1));
}
