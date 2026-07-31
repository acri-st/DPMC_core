// Renders a per-test-group status chart (one coloured bar per group T1..T15)
// to a PNG, using the same bundled Chromium as to-pdf.mjs.
// Usage: node src/scripts/chart.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(
  '/home/tbiet/workspace/dpmc/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.js',
);

const E2E = resolve(import.meta.dirname, '..', '..');
const COVERAGE = resolve(E2E, 'coverage');
const OUT = resolve(E2E, 'reports');
mkdirSync(OUT, { recursive: true });

const report = JSON.parse(
  readFileSync(resolve(COVERAGE, 'plan-coverage.json'), 'utf-8'),
);

// Per-group counts, splitting `todo` into infra-blocked vs pending.
const COLORS = {
  passed: '#10b981', // emerald-500
  failed: '#f43f5e', // rose-500
  skipped: '#f59e0b', // amber-500
  blocked: '#94a3b8', // slate-400
  pending: '#e2e8f0', // slate-200
  descoped: '#c7d2fe', // indigo-200 — a scope decision, not a failure
};
const LABELS = {
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
  blocked: 'Not applicable — capability not provided',
  pending: 'Not executed — pending',
  descoped: 'Not applicable — not part of the delivered system',
};
const ORDER = ['passed', 'failed', 'skipped', 'blocked', 'pending', 'descoped'];

const groups = report.sections.map((sec) => {
  const c = { passed: 0, failed: 0, skipped: 0, blocked: 0, pending: 0, descoped: 0 };
  for (const e of sec.entries) {
    if (e.testCase.descoped) c.descoped++;
    else if (e.status === 'passed') c.passed++;
    else if (e.status === 'failed') c.failed++;
    else if (e.status === 'skipped') c.skipped++;
    else if (e.testCase.blocker) c.blocked++;
    else c.pending++;
  }
  const total = sec.entries.length;
  return { id: sec.section, title: sec.title, total, c };
});

const TRACK = 560; // px — every bar fills the full track (100% = the group total)
const t = report.totals;

const segs = (c, total) =>
  ORDER.filter((k) => c[k] > 0)
    .map(
      (k) =>
        `<div style="width:${(c[k] / total) * TRACK}px;background:${COLORS[k]}" title="${LABELS[k]}: ${c[k]}"></div>`,
    )
    .join('');

const rows = groups
  .map(
    (g) => `
    <div class="row">
      <div class="lbl"><span class="id">${g.id}</span><span class="ttl">${g.title}</span></div>
      <div class="track">${segs(g.c, g.total)}</div>
      <div class="cnt"><b>${g.c.passed}</b><span>/ ${g.total}</span></div>
    </div>`,
  )
  .join('');

const legend = ORDER.map(
  (k) =>
    `<span class="leg"><i style="background:${COLORS[k]}"></i>${LABELS[k]}</span>`,
).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
  #card { width: 920px; padding: 32px 36px; }
  h1 { font-size: 20px; font-weight: 700; }
  .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
  .kpis { display: flex; gap: 22px; margin: 18px 0 22px; font-size: 13px; }
  .kpi b { font-size: 20px; display: block; line-height: 1.1; }
  .kpi span { color: #64748b; }
  .row { display: flex; align-items: center; height: 30px; }
  .lbl { width: 230px; flex: 0 0 230px; display: flex; align-items: baseline; gap: 8px; overflow: hidden; }
  .lbl .id { font-weight: 700; font-size: 13px; width: 34px; flex: 0 0 34px; }
  .lbl .ttl { font-size: 12px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track { width: ${TRACK}px; flex: 0 0 ${TRACK}px; height: 16px; display: flex; border-radius: 4px; overflow: hidden; background: #f1f5f9; }
  .track > div { height: 100%; }
  .cnt { font-size: 12px; color: #334155; margin-left: 12px; white-space: nowrap; }
  .cnt b { color: #0f172a; }
  .cnt span { color: #94a3b8; margin-left: 2px; }
  .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 22px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; }
  .leg { display: flex; align-items: center; gap: 6px; }
  .leg i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .foot { margin-top: 14px; font-size: 11px; color: #94a3b8; }
</style></head><body><div id="card">
  <h1>EOCP Test Execution by Group</h1>
  <div class="sub">Source: DAMPS.ACR.PLN.012 — EOCP Test Plan · ${t.total} cases across ${groups.length} groups · ${t.passed} verified</div>
  <div class="kpis">
    <div class="kpi"><b>${t.passed}</b><span>Passed</span></div>
    <div class="kpi"><b>${t.implemented}</b><span>Executed</span></div>
    <div class="kpi"><b>${t.failed}</b><span>Failed</span></div>
    <div class="kpi"><b>${t.inScope - t.implemented + t.descoped}</b><span>Not applicable</span></div>
  </div>
  ${rows}
  <div class="legend">${legend}</div>
  <div class="foot">Each bar fills its group's planned cases; the count is cases passed over cases planned. Cases marked not applicable carry their reason in Annex A.</div>
</div></body></html>`;

// Resolve the browser from the cache rather than pinning a build number: the
// pinned path silently stopped existing the first time playwright installed a
// newer chromium, and the script died instead of rendering.
function findChromium() {
  const cache = resolve(process.env.HOME ?? '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return undefined;
  const builds = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const build of builds) {
    const exe = resolve(cache, build, 'chrome-linux64', 'chrome');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

const browser = await chromium.launch({
  // undefined lets playwright fall back to its own resolution.
  executablePath: findChromium(),
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
const card = await page.$('#card');
await card.screenshot({ path: resolve(OUT, 'EOCP-Test-Group-Status.png') });
await browser.close();
console.log('wrote reports/EOCP-Test-Group-Status.png');
