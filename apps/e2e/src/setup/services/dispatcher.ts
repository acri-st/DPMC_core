import { spawn } from 'node:child_process';
import { openSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG } from '../../constants/config';

const DISPATCHER_DIR = resolve(CONFIG.paths.rootDir, 'apps/dispatcher');
const LOG_FILE = resolve(CONFIG.paths.logDir, 'dispatcher.log');
const PID_FILE = resolve(CONFIG.paths.logDir, 'dispatcher.pid');

function buildEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DPMC_DISPATCHER_DATABASE_URL: CONFIG.database.url,
    DPMC_DISPATCHER_API_URL: CONFIG.api.url,
    DPMC_DISPATCHER_API_TOKEN: CONFIG.worker.registrationToken,
    DPMC_DISPATCHER_TASK_LOOP_INTERVAL_S: '2',
    DPMC_DISPATCHER_DEPENDENCY_LOOP_INTERVAL_S: '2',
    DPMC_DISPATCHER_DISPATCH_LOOP_INTERVAL_S: '1',
    DPMC_DISPATCHER_MONITOR_LOOP_INTERVAL_S: '2',
    DPMC_DISPATCHER_AGING_LOOP_INTERVAL_S: '5',
    DPMC_DISPATCHER_WATCHER_LOOP_INTERVAL_S: '5',
  };
}

export const dispatcher = {
  start() {
    mkdirSync(CONFIG.paths.logDir, { recursive: true });
    const log = openSync(LOG_FILE, 'a');
    const child = spawn('uv', ['run', 'python', '-m', 'dispatcher'], {
      cwd: DISPATCHER_DIR,
      env: buildEnv(),
      stdio: ['ignore', log, log],
      detached: true,
    });
    child.unref();
    if (!child.pid) throw new Error('Failed to spawn dispatcher');
    writeFileSync(PID_FILE, String(child.pid));
  },

  stop() {
    if (!existsSync(PID_FILE)) return;
    const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
    try { require('node:fs').unlinkSync(PID_FILE); } catch { /* ignore */ }
  },

  async waitHealthy(apiUrl: string, timeoutMs = 20_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${apiUrl}/scheduler/status`);
        if (res.ok) {
          const body = await res.json() as { data?: { healthy?: boolean } | null };
          if (body.data?.healthy === true) return;
        }
      } catch { /* not ready */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Dispatcher did not become healthy within ${timeoutMs}ms`);
  },

  async waitUnhealthy(apiUrl: string, timeoutMs = 40_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${apiUrl}/scheduler/status`);
        if (res.ok) {
          const body = await res.json() as { data?: { healthy?: boolean } | null };
          if (!body.data || body.data.healthy === false) return;
        }
      } catch { /* not ready */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Dispatcher did not become unhealthy within ${timeoutMs}ms`);
  },
};
