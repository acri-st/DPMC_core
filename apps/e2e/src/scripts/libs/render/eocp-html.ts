import type {
  CoverageArtifact,
  CoverageReport,
  EvolutionCoverage,
  TestTag,
} from '../data/types';
import {
  escapeHtml,
  escapeJsonForScript,
  pct,
  renderProgressBar,
} from './format';

function renderRequirementRow(
  requirement: { id: string; description: string },
  tests: TestTag[],
  passStatusByFile: Map<string, boolean>,
) {
  const covered = tests.length > 0;
  const statusBadge = covered
    ? `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">✓</span>`
    : `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs">·</span>`;

  const uniqueFiles = [...new Set(tests.map((t) => t.file))];
  const fileBadges = uniqueFiles
    .map((file) => {
      const pass = passStatusByFile.get(file);
      const color =
        pass === false
          ? 'bg-rose-50 text-rose-700 ring-rose-200'
          : pass === true
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-slate-50 text-slate-600 ring-slate-200';
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ring-1 ring-inset ${color}">${escapeHtml(file)}</span>`;
    })
    .join(' ');

  return `
    <li class="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/60">
      <div class="pt-0.5">${statusBadge}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2 flex-wrap">
          <code class="text-xs font-mono text-slate-500">${escapeHtml(requirement.id)}</code>
          <span class="text-sm ${covered ? 'text-slate-900' : 'text-slate-500'}">${escapeHtml(requirement.description)}</span>
        </div>
        ${fileBadges ? `<div class="mt-1.5 flex flex-wrap gap-1">${fileBadges}</div>` : ''}
      </div>
    </li>`;
}

function renderEvolutionSection(
  evolution: EvolutionCoverage,
  passStatusByFile: Map<string, boolean>,
) {
  const { requirements } = evolution;
  const covered = requirements.filter((r) => r.tests.length > 0).length;
  const percentage = pct(covered, requirements.length);

  const rows = requirements
    .map((r) =>
      renderRequirementRow(r.requirement, r.tests, passStatusByFile),
    )
    .join('');

  return `
    <section class="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden">
      <header class="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
        <h2 class="font-semibold text-slate-900 shrink-0 w-10">${escapeHtml(evolution.evolution)}</h2>
        <div class="flex-1">${renderProgressBar(percentage, 'h-1.5')}</div>
        <span class="text-sm tabular-nums text-slate-500 shrink-0 w-20 text-right">${covered}/${requirements.length} <span class="text-slate-400">(${percentage}%)</span></span>
      </header>
      <ul class="divide-y divide-slate-100">${rows}</ul>
    </section>`;
}

function buildPassStatusByFile(artifact: CoverageArtifact[] | null) {
  const map = new Map<string, boolean>();
  if (!artifact) return map;
  for (const group of artifact) {
    const file = group.path.split('/').pop() ?? group.path;
    const allPassed = group.tests.every((t) =>
      t.coveredRequirements.every((r) => r.success),
    );
    const prev = map.get(file);
    map.set(file, prev === false ? false : allPassed);
  }
  return map;
}

export function renderEocpHtml(
  report: CoverageReport,
  artifact: CoverageArtifact[] | null,
) {
  const passStatusByFile = buildPassStatusByFile(artifact);
  const { total, covered, notCovered } = report.totals;
  const overallPct = pct(covered, total);
  const generatedAt = new Date().toISOString();

  const sections = report.evolutions
    .map((e) => renderEvolutionSection(e, passStatusByFile))
    .join('');

  const embeddedData = escapeJsonForScript({
    generatedAt,
    report,
    artifact: artifact ?? undefined,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EOCP Requirements Coverage</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Keep colored badges/bars in the printed PDF */
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 14mm; }
    @media print {
      .print-hide { display: none !important; }            /* interactive toolbars */
      .max-w-5xl { max-width: none !important; padding: 0 !important; }
      section, li, tr { break-inside: avoid; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
  <div class="max-w-5xl mx-auto px-6 py-10 space-y-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">EOCP Requirements Coverage</h1>
        <p class="text-sm text-slate-500 mt-1">Generated ${escapeHtml(generatedAt)}${artifact ? '' : ' <span class="text-amber-600">· static scan (no jest results)</span>'}</p>
      </div>
      <button
        onclick="downloadJson()"
        class="print-hide inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download JSON
      </button>
    </header>

    <section class="bg-white rounded-xl ring-1 ring-slate-200 p-6">
      <div class="flex items-baseline gap-6 mb-4">
        <div>
          <div class="text-4xl font-bold tabular-nums">${overallPct}<span class="text-xl text-slate-400">%</span></div>
          <div class="text-xs uppercase tracking-wide text-slate-500 mt-0.5">overall</div>
        </div>
        <div class="flex-1">
          ${renderProgressBar(overallPct, 'h-2')}
          <div class="mt-2 text-sm text-slate-600">
            <span class="font-semibold text-slate-900">${covered}</span> of <span class="font-semibold">${total}</span> requirements covered
            <span class="text-slate-400">· ${notCovered} remaining</span>
          </div>
        </div>
      </div>
    </section>

    ${sections}

    <footer class="text-xs text-slate-400 text-center pt-4">
      Traced from <code>@covers EOCP-EX-YY</code> tags in e2e specs.
    </footer>
  </div>

  <script id="report-data" type="application/json">${embeddedData}</script>
  <script>
    function downloadJson() {
      const data = document.getElementById('report-data').textContent;
      const blob = new Blob([JSON.stringify(JSON.parse(data), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'requirements.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>
`;
}
