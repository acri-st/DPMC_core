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
    // Heartbeat well under the API's SCHEDULER_STALE_THRESHOLD_S (10s in e2e)
    // so a running dispatcher stays 'OK' and a stopped one flips to 'KO' fast.
    DPMC_DISPATCHER_HEARTBEAT_INTERVAL_S: '3',
  };
}

export const dispatcher = {
  start() {
    mkdirSync(CONFIG.paths.logDir, { recursive: true });
    const log = openSync(LOG_FILE, 'a');
    // The dispatcher is `package = false` with `src/` as the implicit root
    // (see its pyproject.toml), so it is launched by script path, not `-m`.
    const child = spawn('uv', ['run', 'python', 'src/main.py'], {
      cwd: DISPATCHER_DIR,
      env: buildEnv(),
      stdio: ['ignore', log, log],
      detached: true,
    });
    child.unref();
    if (!child.pid) throw new Error('Failed to spawn dispatcher');
    writeFileSync(PID_FILE, String(child.pid));
  },

  /** True while the process started by `start()` is still alive. */
  isRunning(): boolean {
    if (!existsSync(PID_FILE)) return false;
    const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
    try {
      // Signal 0 probes the process without touching it.
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
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
      if ((await dispatcherStatus(apiUrl)) === 'OK') return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Dispatcher did not become healthy within ${timeoutMs}ms`);
  },

  async waitUnhealthy(apiUrl: string, timeoutMs = 40_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await dispatcherStatus(apiUrl)) === 'KO') return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Dispatcher did not become unhealthy within ${timeoutMs}ms`);
  },
};

// The dispatcher's liveness is surfaced by the API's aggregated `/status`
// endpoint as a service entry `{ name: 'dispatcher', status: 'OK' | 'KO' }`
// (status is 'OK' while the dispatcher's last heartbeat is recent). Returns
// null when the API is unreachable or the entry is missing.
async function dispatcherStatus(apiUrl: string): Promise<'OK' | 'KO' | null> {
  try {
    const res = await fetch(`${apiUrl}/status`);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { services?: Array<{ name: string; status: string }> } | null;
    };
    const entry = body.data?.services?.find((s) => s.name === 'dispatcher');
    if (!entry) return null;
    return entry.status === 'OK' ? 'OK' : 'KO';
  } catch {
    return null;
  }
}
