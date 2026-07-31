// Renders the generated coverage HTML reports to clean, print-oriented PDFs
// using Playwright's bundled Chromium. Interactive toolbars are hidden via the
// templates' `@media print` rules. Usage: node src/scripts/to-pdf.mjs
import { mkdirSync } from 'node:fs';
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

const JOBS = [
  ['plan.html', 'EOCP-Test-Plan-Coverage'],
  ['requirements.html', 'EOCP-Requirements-Traceability'],
];

const browser = await chromium.launch({
  executablePath:
    '/home/tbiet/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.emulateMedia({ media: 'print' });

for (const [src, out] of JOBS) {
  await page.goto(`file://${resolve(COVERAGE, src)}`, { waitUntil: 'networkidle' });
  // Tailwind CDN compiles styles at runtime — give it a beat to apply.
  await page.waitForTimeout(1500);
  await page.pdf({
    path: resolve(OUT, `${out}.pdf`),
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
  });
  await page.screenshot({ path: resolve('/tmp', `${out}.png`), fullPage: false });
  console.log(`wrote reports/${out}.pdf`);
}

await browser.close();
