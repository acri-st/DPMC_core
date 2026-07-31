import type { PlanCoverageReport } from '../data/types';
import { escapeMd, iconFor, pct } from './format';

const LEGEND =
  '**Legend:** ✓ passed · ✗ failed · ○ todo · ⊘ blocked · – skipped · ? untagged';

export function renderPlanMd(report: PlanCoverageReport) {
  const generatedAt = new Date().toISOString();
  const out: string[] = [];
  out.push('# EOCP Test Plan Coverage');
  out.push('');
  out.push('Source: DAMPS.ACR.PLN.012 — EOCP Test Plan');
  out.push('');
  out.push(`> Generated ${generatedAt}.`);
  out.push('');
  out.push(LEGEND);
  out.push('');

  const { total, inScope, descoped, implemented, passed, failed, todo, blocked } =
    report.totals;
  out.push('## Summary');
  out.push('');
  out.push('| Metric | Count | % |');
  out.push('|---|---|---|');
  out.push(`| Total cases | ${total} | |`);
  out.push(`| In scope | ${inScope} | 100% |`);
  out.push(`| Implemented | ${implemented} | ${pct(implemented, inScope)}% |`);
  out.push(`| Passed | ${passed} | ${pct(passed, inScope)}% |`);
  out.push(`| Failed | ${failed} | ${pct(failed, inScope)}% |`);
  out.push(`| Todo (incl. skipped) | ${todo} | ${pct(todo, inScope)}% |`);
  out.push(`| ↳ of which blocked | ${blocked} | ${pct(blocked, inScope)}% |`);
  out.push(`| Not applicable | ${descoped} | — |`);
  out.push('');

  for (const section of report.sections) {
    const sTotal = section.entries.length;
    const sPassed = section.entries.filter((e) => e.status === 'passed').length;
    const sImplemented = section.entries.filter(
      (e) => e.status !== 'todo',
    ).length;
    out.push(
      `## ${section.section} — ${section.title} (${sPassed}/${sImplemented}/${sTotal} pass·impl·total)`,
    );
    out.push('');
    out.push('| ID | Status | Title | Covers | Blocker |');
    out.push('|---|---|---|---|---|');
    for (const entry of section.entries) {
      const icon = iconFor(entry.status, Boolean(entry.testCase.blocker));
      const covers = entry.testCase.covers.join(', ') || '—';
      const blocker = entry.testCase.blocker
        ? escapeMd(entry.testCase.blocker)
        : '—';
      out.push(
        `| \`${entry.testCase.id}\` | ${icon} ${entry.status} | ${escapeMd(entry.testCase.title)} | ${covers} | ${blocker} |`,
      );
    }
    out.push('');
  }

  return out.join('\n');
}
