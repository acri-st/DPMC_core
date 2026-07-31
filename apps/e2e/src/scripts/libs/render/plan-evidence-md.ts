import type {
  PlanCoverageEntry,
  PlanCoverageReport,
  PlanStatus,
} from '../data/types';
import { escapeMd, pct } from './format';

// Evidence-oriented view of the plan coverage: per executed case it shows the
// expected result (from the plan), the spec that asserts it, and the run
// verdict — i.e. proof that the case *passed*, not merely that it exists.
// Designed to be pasted into §2.2 of DAMPS.ACR.REP.057 (EOCP Test Report).

const VERDICT: Record<PlanStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
  todo: 'Not executed',
  untagged: 'Not executed',
};

const isExecuted = (s: PlanStatus): boolean =>
  s === 'passed' || s === 'failed' || s === 'skipped';

function expectedOf(entry: PlanCoverageEntry): string {
  const { steps } = entry.testCase;
  if (steps.length === 0) return '—';
  return escapeMd(steps.map((s) => `${s.n}) ${s.expected}`).join('; '));
}

// Proof by reference: for an automated e2e campaign the observed result is the
// set of assertions in the spec file(s) and their verdict in the Jest run.
function evidenceOf(entry: PlanCoverageEntry): string {
  if (isExecuted(entry.status)) {
    const files = [...new Set(entry.tests.map((t) => t.file))];
    return files.length ? files.map((f) => `\`${f}\``).join('<br>') : '—';
  }
  return entry.testCase.blocker
    ? `Not executed — ${escapeMd(entry.testCase.blocker)}`
    : 'Not executed — not yet implemented';
}

export function renderPlanEvidenceMd(report: PlanCoverageReport): string {
  const generatedAt = new Date().toISOString();
  const flat = report.sections.flatMap((s) => s.entries);
  const total = flat.length;
  const passed = flat.filter((e) => e.status === 'passed').length;
  const failed = flat.filter((e) => e.status === 'failed').length;
  const skipped = flat.filter((e) => e.status === 'skipped').length;
  const notExecuted = flat.filter((e) => !isExecuted(e.status)).length;
  const blocked = flat.filter(
    (e) => !isExecuted(e.status) && e.testCase.blocker,
  ).length;
  const executed = passed + failed + skipped;

  const out: string[] = [];
  out.push('# EOCP Test Execution Evidence');
  out.push('');
  out.push('Source: DAMPS.ACR.PLN.012 — EOCP Test Plan');
  out.push(
    'Evidence run: `apps/e2e/coverage/jest-results.json` (Jest e2e campaign)',
  );
  out.push('');
  out.push(`> Generated ${generatedAt}.`);
  out.push('');
  out.push(
    'For each case, the *expected result* is the plan-defined behaviour, the ' +
      '*evidence* is the spec file whose assertions verify it, and the ' +
      '*verdict* is its outcome in the Jest run above.',
  );
  out.push('');

  out.push('## Execution summary');
  out.push('');
  out.push('| Outcome | Count | % |');
  out.push('|---|---|---|');
  out.push(`| Total planned | ${total} | 100% |`);
  out.push(`| Executed | ${executed} | ${pct(executed, total)}% |`);
  out.push(`| ↳ Passed | ${passed} | ${pct(passed, total)}% |`);
  out.push(`| ↳ Failed | ${failed} | ${pct(failed, total)}% |`);
  out.push(`| ↳ Skipped | ${skipped} | ${pct(skipped, total)}% |`);
  out.push(`| Not executed | ${notExecuted} | ${pct(notExecuted, total)}% |`);
  out.push(
    `| ↳ of which blocked (infra) | ${blocked} | ${pct(blocked, total)}% |`,
  );
  out.push('');

  for (const section of report.sections) {
    const entries = section.entries;
    const sExecuted = entries.filter((e) => isExecuted(e.status)).length;
    const sPassed = entries.filter((e) => e.status === 'passed').length;
    out.push(
      `## ${section.section} — ${section.title} (${sPassed}/${sExecuted}/${entries.length} passed·executed·total)`,
    );
    out.push('');
    out.push('| ID | Title | Requirement(s) | Expected result | Verdict | Evidence |');
    out.push('|---|---|---|---|---|---|');
    for (const entry of entries) {
      const { testCase } = entry;
      const covers = testCase.covers.join(', ') || '—';
      out.push(
        `| \`${testCase.id}\` | ${escapeMd(testCase.title)} | ${covers} | ${expectedOf(entry)} | ${VERDICT[entry.status]} | ${evidenceOf(entry)} |`,
      );
    }
    out.push('');
  }

  return out.join('\n');
}
