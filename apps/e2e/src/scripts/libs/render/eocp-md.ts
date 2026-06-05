import type { CoverageReport } from '../data/types';
import { escapeMd, pct } from './format';

const LEGEND = '**Legend:** Covered | Not covered | N/A (not testable via e2e)';

export function renderEocpMd(report: CoverageReport) {
  const generatedAt = new Date().toISOString();
  const out: string[] = [];
  out.push('# Requirements Traceability Matrix');
  out.push('');
  out.push('Source: DAMPS.ACR.DOC.031 - i1r2 - EOCP Design Document');
  out.push('');
  out.push(
    `> Auto-generated from \`@covers EOCP-Ex-yy\` tags in e2e specs. Last update: ${generatedAt}.`,
  );
  out.push(
    '> Do not edit by hand — re-run `pnpm --filter @dpmc/e2e test:report` to refresh.',
  );
  out.push('');
  out.push(LEGEND);
  out.push('');

  let totalCovered = 0;
  let totalNa = 0;
  let totalNotCovered = 0;

  for (const evolution of report.evolutions) {
    const sectionTitle = sectionTitleFor(evolution.evolution);
    out.push(`## ${evolution.evolution} — ${sectionTitle}`);
    out.push('');
    out.push('| ID | Requirement | Status | Test files |');
    out.push('|---|---|---|---|');
    for (const { requirement, tests } of evolution.requirements) {
      const status = requirement.na
        ? 'N/A'
        : tests.length > 0
          ? 'Covered'
          : 'Not covered';
      if (status === 'Covered') totalCovered++;
      else if (status === 'N/A') totalNa++;
      else totalNotCovered++;
      const files = [...new Set(tests.map((t) => t.file))].join(', ');
      out.push(
        `| ${requirement.id} | ${escapeMd(requirement.description)} | ${status} | ${files || '—'} |`,
      );
    }
    out.push('');
  }

  const total = totalCovered + totalNa + totalNotCovered;
  const coveredPct = total === 0 ? 0 : Math.round((totalCovered / total) * 100);

  out.push('---');
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push('| Status | Count | % |');
  out.push('|---|---|---|');
  out.push(`| Covered | ${totalCovered} | ${pct(totalCovered, total)}% |`);
  out.push(`| Not covered | ${totalNotCovered} | ${pct(totalNotCovered, total)}% |`);
  out.push(`| N/A | ${totalNa} | ${pct(totalNa, total)}% |`);
  out.push(`| **Total** | **${total}** | |`);
  out.push('');
  out.push(`Coverage: **${coveredPct}%** of testable requirements covered.`);
  out.push('');

  return out.join('\n');
}

function sectionTitleFor(evolution: string) {
  const titles: Record<string, string> = {
    E1: 'Architecture',
    E2: 'Production Modes',
    E3: 'Automatic Node Selection',
    E4: 'Production Chain Embedding',
    E5: 'Task Dependency Rules',
    E6: 'Scheduling System',
    E7: 'Triggering Modes',
    E8: 'Versioning (Processors)',
    E9: 'Task Tables',
    E10: 'Priority Management',
    E11: 'APIs',
    E12: 'Security',
    E13: 'Docker vs Apptainers',
    E14: 'Versioning (Products)',
    E15: 'Environmental Footprint',
  };
  return titles[evolution] ?? evolution;
}
