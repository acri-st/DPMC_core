import { spawn, execFileSync, execSync, type ChildProcess } from 'node:child_process';
import { openSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApiEnv, CONFIG } from '../../constants/config';

const PID_FILE = resolve(CONFIG.paths.logDir, 'api.pid');
const LOG_FILE = resolve(CONFIG.paths.logDir, 'api.log');
const API_DIST = resolve(CONFIG.paths.rootDir, 'apps/api/dist/main.js');

// Always rebuild: skipping on `dist/main.js` exists silently tests a stale API,
// so results stop reflecting the code under test. Turbo caches, so a no-op
// rebuild costs a cache lookup.
function buildApi(env: NodeJS.ProcessEnv) {
  execFileSync('pnpm', ['turbo', 'run', 'build', '--filter=@dpmc/api'], {
    cwd: CONFIG.paths.rootDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
  });
  if (!existsSync(API_DIST)) {
    throw new Error(`API build produced no ${API_DIST}`);
  }
}

function killPortIfBusy(port: number) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (out) {
      for (const pid of out.split('\n').filter(Boolean)) {
        try { process.kill(Number(pid), 'SIGTERM'); } catch { /* already gone */ }
      }
      // Give the OS a moment to release the port
      execSync('sleep 1');
    }
  } catch { /* lsof exit 1 means no process on port */ }
}

export const api = {
  async start() {
    mkdirSync(CONFIG.paths.logDir, { recursive: true });
    const env = buildApiEnv();
    buildApi(env);

    // Kill any stale process occupying the API port before spawning a fresh one
    const apiPort = Number(new URL(CONFIG.api.url).port || 3000);
    killPortIfBusy(apiPort);

    const log = openSync(LOG_FILE, 'w');
    const child: ChildProcess = spawn('node', [API_DIST], {
      cwd: CONFIG.paths.rootDir,
      env,
      stdio: ['ignore', log, log],
      detached: true,
    });
    child.unref();
    if (!child.pid) throw new Error('Failed to spawn API process');
    writeFileSync(PID_FILE, String(child.pid));

    await waitReady();
  },

  stop() {
    if (!existsSync(PID_FILE)) return;
    const pid = Number(readFileSync(PID_FILE, 'utf8'));
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
  },
};

async function waitReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `${CONFIG.api.url}/status`;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl);
      if (res.status < 500) return;
    } catch (e) {
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `API did not become ready within ${timeoutMs}ms (last error: ${String(lastError)}). ` +
      `See ${LOG_FILE}.`,
  );
}
