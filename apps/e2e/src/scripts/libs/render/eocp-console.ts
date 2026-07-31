import type { CoverageReport, EvolutionCoverage } from '../data/types';
import { pct } from './format';

const BAR_WIDTH = 20;
const SEPARATOR = '='.repeat(80);

export function renderEocpConsole(report: CoverageReport) {
  const lines: string[] = [
    SEPARATOR,
    '  EOCP Requirements Coverage Report',
    SEPARATOR,
    '',
  ];

  for (const evolution of report.evolutions) {
    lines.push(renderEvolutionHeader(evolution));
    for (const { requirement, tests } of evolution.requirements) {
      if (tests.length > 0) {
        const files = [...new Set(tests.map((t) => t.file))].join(', ');
        lines.push(`    ✓ ${requirement.id}: ${requirement.description}`);
        lines.push(`      └─ ${files}`);
        if (requirement.note) {
          lines.push(`         note: ${requirement.note}`);
        }
      } else {
        lines.push(`    ✗ ${requirement.id}: ${requirement.description}`);
      }
    }
    lines.push('');
  }

  const { total, inScope, descoped, covered, notCovered } = report.totals;
  lines.push(SEPARATOR);
  lines.push(
    `  Total: ${total} | In scope: ${inScope} | Covered: ${covered} | Not covered: ${notCovered} | Not applicable: ${descoped}`,
  );
  lines.push(`  Coverage: ${pct(covered, inScope)}% of in-scope requirements`);
  lines.push(SEPARATOR);

  return lines.join('\n');
}

function renderEvolutionHeader(evolution: EvolutionCoverage) {
  const { requirements } = evolution;
  const scoped = requirements.filter((r) => !r.requirement.descoped);
  const covered = scoped.filter((r) => r.tests.length > 0).length;
  const percentage = pct(covered, scoped.length);
  const filled = Math.round((percentage / 100) * BAR_WIDTH);
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
  return `  ${evolution.evolution.padEnd(5)} ${bar} ${percentage}% (${covered}/${scoped.length})`;
}
