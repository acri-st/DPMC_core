import type {
  PlanCoverageEntry,
  PlanCoverageReport,
  PlanSectionCoverage,
  PlanStatus,
} from '../data/types';
import {
  escapeHtml,
  escapeJsonForScript,
  pct,
  renderProgressBar,
} from './format';
import { renderPlanMd } from './plan-md';

interface Badge {
  icon: string;
  classes: string;
  label: string;
}

const BADGES = {
  passed: {
    icon: '✓',
    classes: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    label: 'passed',
  },
  failed: {
    icon: '✗',
    classes: 'bg-rose-100 text-rose-700 ring-rose-200',
    label: 'failed',
  },
  skipped: {
    icon: '–',
    classes: 'bg-slate-100 text-slate-600 ring-slate-200',
    label: 'skipped',
  },
  untagged: {
    icon: '?',
    classes: 'bg-amber-100 text-amber-700 ring-amber-200',
    label: 'untagged',
  },
  blocked: {
    icon: '⊘',
    classes: 'bg-zinc-100 text-zinc-600 ring-zinc-300',
    label: 'blocked',
  },
  todo: {
    icon: '○',
    classes: 'bg-sky-100 text-sky-700 ring-sky-200',
    label: 'todo',
  },
} as const satisfies Record<string, Badge>;

function statusBadge(status: PlanStatus, hasBlocker: boolean): Badge {
  if (status === 'passed') return BADGES.passed;
  if (status === 'failed') return BADGES.failed;
  if (status === 'skipped') return BADGES.skipped;
  if (status === 'untagged') return BADGES.untagged;
  return hasBlocker ? BADGES.blocked : BADGES.todo;
}

const LEGEND: Array<{ badge: Badge; meaning: string }> = [
  {
    badge: BADGES.passed,
    meaning:
      'Test case has at least one e2e spec tagged with @plan, and every matching jest assertion passed.',
  },
  {
    badge: BADGES.failed,
    meaning:
      'Test case has tagged spec(s), and at least one matching jest assertion failed.',
  },
  {
    badge: BADGES.skipped,
    meaning:
      'Test case has tagged spec(s), but every matching jest assertion was skipped (it.skip / xit).',
  },
  {
    badge: BADGES.todo,
    meaning:
      'No @plan tag references this test case yet, or only test.todo placeholders. Implementation work is open.',
  },
  {
    badge: BADGES.blocked,
    meaning:
      'Same as todo, but the test plan declares a blocker (feature not yet implemented, infra prerequisite, etc.). See the "blocker:" line.',
  },
  {
    badge: BADGES.untagged,
    meaning:
      'A @plan tag exists in source but no jest assertion matched it (test.each placeholders, renamed tests, or no jest run yet). The pass/fail signal is missing — fix the tag or rerun jest.',
  },
];

function renderLegend(): string {
  const items = LEGEND.map(({ badge, meaning }) => {
    return `
      <li class="flex items-start gap-3" data-legend-status="${badge.label}">
        <span class="inline-flex items-center justify-center w-5 h-5 mt-0.5 rounded-full text-xs font-bold ring-1 ring-inset ${badge.classes} shrink-0" title="${badge.label}">${badge.icon}</span>
        <div class="text-xs leading-relaxed">
          <span class="font-semibold text-slate-900">${badge.label}</span>
          <span class="text-slate-600"> — ${escapeHtml(meaning)}</span>
        </div>
      </li>`;
  }).join('');

  return `
    <details class="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden" data-testid="legend">
      <summary class="px-5 py-3 cursor-pointer select-none flex items-center justify-between text-sm font-medium text-slate-700 hover:bg-slate-50">
        <span>Legend — what each status means</span>
        <span class="text-xs text-slate-400">click to expand</span>
      </summary>
      <ul class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100">${items}</ul>
    </details>`;
}

function renderEntry(entry: PlanCoverageEntry) {
  const { testCase, tests, status } = entry;
  const badge = statusBadge(status, Boolean(testCase.blocker));

  const fileBadges = [...new Set(tests.map((t) => t.file))]
    .map(
      (f) =>
        `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200">${escapeHtml(f)}</span>`,
    )
    .join(' ');

  const coversBadges = testCase.covers
    .map(
      (id) =>
        `<code class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${escapeHtml(id)}</code>`,
    )
    .join(' ');

  const blockerLine = testCase.blocker
    ? `<div class="mt-1 text-xs text-zinc-500"><span class="font-medium text-zinc-600">blocker:</span> ${escapeHtml(testCase.blocker)}</div>`
    : '';

  return `
    <li class="px-5 py-3 hover:bg-slate-50/60">
      <div class="flex items-start gap-3">
        <span class="inline-flex items-center justify-center w-5 h-5 mt-0.5 rounded-full text-xs font-bold ring-1 ring-inset ${badge.classes}" title="${badge.label}">${badge.icon}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2 flex-wrap">
            <code class="text-xs font-mono text-slate-500">${escapeHtml(testCase.id)}</code>
            <span class="text-sm text-slate-900">${escapeHtml(testCase.title)}</span>
          </div>
          ${coversBadges ? `<div class="mt-1 flex flex-wrap gap-1">${coversBadges}</div>` : ''}
          ${fileBadges ? `<div class="mt-1 flex flex-wrap gap-1">${fileBadges}</div>` : ''}
          ${blockerLine}
        </div>
      </div>
    </li>`;
}

function renderSection(section: PlanSectionCoverage) {
  const total = section.entries.length;
  const implemented = section.entries.filter((e) => e.status !== 'todo').length;
  const passed = section.entries.filter((e) => e.status === 'passed').length;
  const percentage = pct(passed, total);

  const rows = section.entries.map(renderEntry).join('');

  return `
    <section class="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden">
      <header class="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
        <h2 class="font-semibold text-slate-900 shrink-0 w-12">${escapeHtml(section.section)}</h2>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-700 mb-1.5 truncate">${escapeHtml(section.title)}</div>
          ${renderProgressBar(percentage, 'h-1.5')}
        </div>
        <span class="text-sm tabular-nums text-slate-500 shrink-0 w-32 text-right">
          <span class="text-emerald-600 font-medium">${passed}</span> /
          <span class="text-slate-700">${implemented}</span> /
          <span class="text-slate-500">${total}</span>
          <span class="block text-[10px] text-slate-400 uppercase tracking-wide">pass · impl · total</span>
        </span>
      </header>
      <ul class="divide-y divide-slate-100">${rows}</ul>
    </section>`;
}

export function renderPlanHtml(report: PlanCoverageReport) {
  const { total, implemented, passed, failed, todo, blocked } = report.totals;
  const implPct = pct(implemented, total);
  const passPct = pct(passed, total);
  const generatedAt = new Date().toISOString();

  const sections = report.sections.map(renderSection).join('');

  const embeddedData = escapeJsonForScript({ generatedAt, report });
  const embeddedMd = escapeJsonForScript(renderPlanMd(report));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EOCP Test Plan Coverage</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
  <div class="max-w-5xl mx-auto px-6 py-10 space-y-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">EOCP Test Plan Coverage</h1>
        <p class="text-sm text-slate-500 mt-1">DAMPS.ACR.PLN.012 · Generated ${escapeHtml(generatedAt)}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          onclick="downloadHtml()"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          title="Download this report as a self-contained HTML file"
        >
          HTML
        </button>
        <button
          onclick="downloadMd()"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-slate-900 ring-1 ring-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          title="Download as Markdown"
        >
          MD
        </button>
        <button
          onclick="downloadJson()"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-slate-900 ring-1 ring-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          title="Download as JSON"
        >
          JSON
        </button>
      </div>
    </header>

    <section class="bg-white rounded-xl ring-1 ring-slate-200 p-6" data-testid="totals">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <div class="text-3xl font-bold tabular-nums" data-testid="total-cases">${total}</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 mt-0.5">total cases</div>
        </div>
        <div>
          <div class="text-3xl font-bold tabular-nums text-slate-900" data-testid="total-implemented">${implemented}</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 mt-0.5">implemented (${implPct}%)</div>
        </div>
        <div>
          <div class="text-3xl font-bold tabular-nums text-emerald-600" data-testid="total-passed">${passed}</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 mt-0.5">passed (${passPct}%)</div>
        </div>
        <div>
          <div class="text-3xl font-bold tabular-nums ${failed > 0 ? 'text-rose-600' : 'text-slate-400'}" data-testid="total-failed">${failed}</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 mt-0.5">failed</div>
        </div>
        <div>
          <div class="text-3xl font-bold tabular-nums text-zinc-500"><span data-testid="total-blocked">${blocked}</span>/<span data-testid="total-todo">${todo}</span></div>
          <div class="text-xs uppercase tracking-wide text-slate-500 mt-0.5">blocked / todo</div>
        </div>
      </div>
      <div class="mt-4">${renderProgressBar(passPct, 'h-2')}</div>
    </section>

    ${renderLegend()}

    ${sections}

    <footer class="text-xs text-slate-400 text-center pt-4">
      Traced from <code>@plan TXX.Y</code> tags in e2e specs · Source: <code>src/constants/test-cases.ts</code>
    </footer>
  </div>

  <script id="plan-data" type="application/json">${embeddedData}</script>
  <script id="plan-md" type="text/plain">${embeddedMd}</script>
  <script>
    function triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    function downloadJson() {
      const raw = document.getElementById('plan-data').textContent;
      const pretty = JSON.stringify(JSON.parse(raw), null, 2);
      triggerDownload(new Blob([pretty], { type: 'application/json' }), 'plan-coverage.json');
    }
    function downloadMd() {
      const md = JSON.parse(document.getElementById('plan-md').textContent);
      triggerDownload(new Blob([md], { type: 'text/markdown' }), 'plan-coverage.md');
    }
    function downloadHtml() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
      triggerDownload(blob, 'plan-coverage.html');
    }
  </script>
</body>
</html>
`;
}
