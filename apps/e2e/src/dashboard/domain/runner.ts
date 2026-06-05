import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildJestCommand, type RunScope } from './commands.ts';
import type { RunArtifact, TestDefinitionEntry } from './types.ts';
import { loadCatalog } from './catalog.ts';
import { loadRequirements } from './requirements.ts';
import { buildCoverageState } from './state.ts';

export interface RunnerResult {
  artifact: RunArtifact;
  catalog: TestDefinitionEntry[];
}

// Absolute path to the e2e app root (this file lives at src/dashboard/domain/).
const _dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
const E2E_DIR = join(_dirname, '..', '..', '..');

export async function executeRun(rootDir: string, scope: RunScope): Promise<RunnerResult> {
  const command = buildJestCommand(scope);
  const startedAt = new Date().toISOString();

  const catalog = loadCatalog(rootDir);
  const payload = await runJestRunner(scope);
  const finishedAt = new Date().toISOString();
  const mappedTests = mapRunTestsToCatalog(payload.tests, catalog);

  const artifact: RunArtifact = {
    status: payload.status,
    startedAt,
    finishedAt,
    scope,
    command,
    summary: payload.summary,
    tests: mappedTests,
    stdout: payload.stdout ?? '',
    stderr: payload.stderr ?? '',
  };

  const artifactsDir = join(rootDir, 'artifacts');
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(join(artifactsDir, 'current-run.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  const coverage = buildCoverageState({
    requirements: loadRequirements(rootDir),
    catalog,
    lastRun: artifact,
  });
  writeFileSync(join(artifactsDir, 'current-coverage.json'), `${JSON.stringify(coverage, null, 2)}\n`);

  return { artifact, catalog };
}

export function mapRunTestsToCatalog(
  tests: RunArtifact['tests'],
  catalog: TestDefinitionEntry[],
): RunArtifact['tests'] {
  const testsBySelector = new Map(catalog.map((test) => [test.selector, test] as const));
  const testsByFile = new Map(catalog.map((test) => [test.file, test] as const));
  return tests.map((test) => {
    const match = testsBySelector.get(test.selector) ?? testsByFile.get(test.file);
    return {
      ...test,
      id: match?.id ?? test.id,
    };
  });
}

// ─── Jest runner ────────────────────────────────────────────────────────────

interface JestJsonOutput {
  success: boolean;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: JestTestFile[];
}

interface JestTestFile {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  assertionResults: JestTestCase[];
}

interface JestTestCase {
  title: string;
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'todo';
  duration?: number | null;
  failureMessages: string[];
  ancestorTitles: string[];
}

async function runJestRunner(scope: RunScope): Promise<{
  status: 'passed' | 'failed' | 'skipped';
  summary: RunArtifact['summary'];
  tests: RunArtifact['tests'];
  stdout: string;
  stderr: string;
}> {
  const jest = join(E2E_DIR, 'node_modules', '.bin', 'jest');
  const args = buildJestArgs(scope);

  const { stdout, stderr, code } = await spawnProcess(jest, args, E2E_DIR, buildJestEnv());

  let jestOutput: JestJsonOutput;
  try {
    jestOutput = JSON.parse(stdout) as JestJsonOutput;
  } catch {
    throw new Error(
      `Jest did not produce valid JSON (exit ${code}).\n${stderr || stdout}`,
    );
  }

  const tests = translateJestResults(jestOutput);
  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const skipped = tests.filter((t) => t.status === 'skipped').length;

  return {
    status: failed > 0 ? 'failed' : passed > 0 ? 'passed' : 'skipped',
    summary: { passed, failed, skipped },
    tests,
    // Test logger writes to stderr (so it doesn't corrupt --json stdout).
    // Expose it as stdout in the artifact so the dashboard can display it.
    stdout: stderr,
    stderr: stdout,
  };
}

function buildJestArgs(scope: RunScope): string[] {
  const base = ['--json', '--forceExit'];
  if (scope.type === 'all') return base;
  if (scope.type === 'file') {
    const pattern = scope.value.replace(/\./g, '\\.');
    return [...base, '--testPathPatterns', pattern];
  }
  if (scope.type === 'files') {
    const pattern = scope.values.map((v) => v.replace(/\./g, '\\.')).join('|');
    return [...base, '--testPathPatterns', pattern];
  }
  return [...base, '--testNamePattern', scope.value];
}

function buildJestEnv(): NodeJS.ProcessEnv {
  // E2E_EXTERNAL=1 skips Docker/DB-reset/seed/API start — relies on the already-running dev stack.
  const env: NodeJS.ProcessEnv = { ...process.env, E2E_EXTERNAL: '1' };
  if (process.env.DPMC_API_URL) env['API_URL'] = process.env.DPMC_API_URL;
  return env;
}

function translateJestResults(output: JestJsonOutput): RunArtifact['tests'] {
  const results: RunArtifact['tests'] = [];

  for (const file of output.testResults) {
    const relFile = relative(E2E_DIR, file.name);

    const selectorMatch = relFile.match(/\/(t\d+\.\d+)\.e2e-spec\.ts$/);
    const selector = selectorMatch ? selectorMatch[1] : relFile;

    const steps = file.assertionResults.filter((tc) => tc.status !== 'todo');
    const durationMs = steps.reduce((sum, tc) => sum + (tc.duration ?? 0), 0);

    let status: 'passed' | 'failed' | 'skipped';
    if (steps.some((tc) => tc.status === 'failed')) {
      status = 'failed';
    } else if (steps.some((tc) => tc.status === 'passed')) {
      status = 'passed';
    } else {
      status = 'skipped';
    }

    const failures = steps
      .filter((tc) => tc.status === 'failed' && tc.failureMessages.length > 0)
      .map((tc) => `${tc.fullName}\n${tc.failureMessages.join('\n')}`);

    const error =
      failures.length > 0
        ? { message: failures[0].split('\n')[1] ?? 'Test failed', stack: failures.join('\n\n') }
        : undefined;

    results.push({ id: selector, file: relFile, selector, status, durationMs, error });
  }

  return results;
}

function spawnProcess(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: env ?? process.env });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => { resolve({ stdout, stderr, code: code ?? 1 }); });
  });
}
