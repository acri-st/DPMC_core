import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../constants/config';
import { buildEocpReport } from './libs/builders/eocp';
import { buildPlanReport } from './libs/builders/plan';
import { openInBrowser } from './libs/browser';
import { loadCoverage } from './libs/data/load-coverage';
import { renderEocpConsole } from './libs/render/eocp-console';
import { renderEocpHtml } from './libs/render/eocp-html';
import { renderEocpJson } from './libs/render/eocp-json';
import { renderEocpMd } from './libs/render/eocp-md';
import { renderPlanConsole } from './libs/render/plan-console';
import { renderPlanHtml } from './libs/render/plan-html';
import { renderPlanMd } from './libs/render/plan-md';

const TESTS_DIR = join(__dirname, '..', 'tests');
const COVERAGE_DIR = join(CONFIG.paths.e2eDir, 'coverage');
const JEST_RESULTS = join(COVERAGE_DIR, 'jest-results.json');

const argv = new Set(process.argv.slice(2));
const consoleMode = argv.has('--console');
const noOpen = argv.has('--no-open');

const { tags, results } = loadCoverage(TESTS_DIR, JEST_RESULTS, CONFIG.paths.e2eDir);
const eocpReport = buildEocpReport(tags);
const planReport = buildPlanReport(tags, results);

if (consoleMode) {
  console.log(renderEocpConsole(eocpReport));
  console.log();
  console.log(renderPlanConsole(planReport));
  process.exit(0);
}

mkdirSync(COVERAGE_DIR, { recursive: true });

const eocpJson = results ? renderEocpJson(tags, results) : null;
const planHtmlPath = join(COVERAGE_DIR, 'plan.html');

const artifacts: Array<[string, string]> = [
  [planHtmlPath, renderPlanHtml(planReport)],
  [join(COVERAGE_DIR, 'plan-coverage.json'), JSON.stringify(planReport, null, 2) + '\n'],
  [join(COVERAGE_DIR, 'plan-coverage.md'), renderPlanMd(planReport)],
  [join(COVERAGE_DIR, 'requirements.html'), renderEocpHtml(eocpReport, eocpJson)],
  [join(CONFIG.paths.e2eDir, 'TRACEABILITY.md'), renderEocpMd(eocpReport)],
];

for (const [path, content] of artifacts) {
  writeFileSync(path, content);
}

const note = results ? '' : ' (no jest results — todo / blocked only)';
console.log(`Wrote plan HTML  → ${planHtmlPath}${note}`);
for (const [path] of artifacts.slice(1)) {
  console.log(`Wrote            → ${path}`);
}

if (!noOpen) {
  openInBrowser(planHtmlPath);
}
