import type { PlanCoverageReport, PlanSectionCoverage } from '../data/types';
import { iconFor, pct } from './format';

const BAR_WIDTH = 20;
const SEPARATOR = '='.repeat(80);

export function renderPlanConsole(report: PlanCoverageReport) {
  const lines: string[] = [
    SEPARATOR,
    '  EOCP Test Plan Coverage Report (DAMPS.ACR.PLN.012)',
    SEPARATOR,
    '',
  ];

  for (const section of report.sections) {
    lines.push(renderSectionHeader(section));
    for (const entry of section.entries) {
      const icon = iconFor(entry.status, Boolean(entry.testCase.blocker));
      lines.push(`    ${icon} ${entry.testCase.id}: ${entry.testCase.title}`);
      if (entry.testCase.blocker && entry.status === 'todo') {
        lines.push(`        ⤷ blocked: ${entry.testCase.blocker}`);
      }
    }
    lines.push('');
  }

  const { total, inScope, descoped, implemented, passed, failed, todo, blocked } =
    report.totals;
  lines.push(SEPARATOR);
  lines.push(
    `  Total: ${total} | In scope: ${inScope} | Implemented: ${implemented} | Pass: ${passed} | Fail: ${failed} | Not applicable: ${descoped}`,
  );
  lines.push(`  Todo: ${todo} (of which ${blocked} blocked)`);
  lines.push(
    `  Coverage: ${pct(passed, inScope)}% pass · ${pct(implemented, inScope)}% implemented (of in-scope cases)`,
  );
  lines.push(SEPARATOR);

  return lines.join('\n');
}

function renderSectionHeader(section: PlanSectionCoverage) {
  const scoped = section.entries.filter((e) => !e.testCase.descoped);
  const total = scoped.length;
  const passed = scoped.filter((e) => e.status === 'passed').length;
  const percentage = pct(passed, total);
  const filled = Math.round((percentage / 100) * BAR_WIDTH);
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
  const label = `${section.section} ${section.title}`;
  return `  ${label.padEnd(50)} ${bar} ${percentage}% (${passed}/${total})`;
}
