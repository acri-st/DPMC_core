import { spawn } from 'node:child_process';
import { openSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG } from '../../constants/config';

const WORKER_DIR = resolve(CONFIG.paths.rootDir, 'apps/worker');

function pidFile(name: string) {
  return resolve(CONFIG.paths.logDir, `worker-${name}.pid`);
}

function buildEnv(name: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DPMC_API_URL: CONFIG.api.url,
    DPMC_WORKER_TOKEN: CONFIG.worker.registrationToken,
    DPMC_DATA_CENTER_CODE: 'TST',
    DPMC_PROCESSING_DIR: `/tmp/dpmc-e2e-${name}/processing`,
    DPMC_CACHE_DIR: `/tmp/dpmc-e2e-${name}/cache`,
    DPMC_HEARTBEAT_INTERVAL_S: '3',
    DPMC_LOG_LEVEL: 'INFO',
    DPMC_LOG_SHIPPING_ENABLED: 'false',
  };
}

export const workerProcess = {
  start(name: string) {
    mkdirSync(CONFIG.paths.logDir, { recursive: true });
    const logFile = resolve(CONFIG.paths.logDir, `worker-${name}.log`);
    const log = openSync(logFile, 'a');
    const child = spawn('uv', ['run', 'python', '-m', 'worker'], {
      cwd: WORKER_DIR,
      env: buildEnv(name),
      stdio: ['ignore', log, log],
      detached: true,
    });
    child.unref();
    if (!child.pid) throw new Error(`Failed to spawn worker ${name}`);
    writeFileSync(pidFile(name), String(child.pid));
  },

  stop(name: string) {
    const pf = pidFile(name);
    if (!existsSync(pf)) return;
    const pid = Number(readFileSync(pf, 'utf8').trim());
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
    try { unlinkSync(pf); } catch { /* ignore */ }
  },

  stopAll() {
    if (!existsSync(CONFIG.paths.logDir)) return;
    for (const f of readdirSync(CONFIG.paths.logDir)) {
      if (!f.startsWith('worker-') || !f.endsWith('.pid')) continue;
      const name = f.replace(/^worker-/, '').replace(/\.pid$/, '');
      workerProcess.stop(name);
    }
  },

  async waitRegistered(apiUrl: string, hostname: string, cookie: string, timeoutMs = 20_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${apiUrl}/host?q=${encodeURIComponent(hostname)}`, {
          headers: cookie ? { Cookie: cookie } : {},
        });
        if (res.ok) {
          const body = await res.json() as { data?: { id: string; hostname: string; status: string }[] };
          const host = (body.data ?? []).find((h) => h.hostname === hostname && h.status === 'Up');
          if (host) return host.id;
        }
      } catch { /* not ready */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Worker ${hostname} did not register within ${timeoutMs}ms`);
  },

  async waitOffline(apiUrl: string, hostId: string, cookie: string, timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${apiUrl}/host/${hostId}`, {
          headers: cookie ? { Cookie: cookie } : {},
        });
        if (res.ok) {
          const body = await res.json() as { data?: { status: string } };
          if (body.data?.status === 'Off') return;
        }
      } catch { /* not ready */ }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Worker ${hostId} did not go offline within ${timeoutMs}ms`);
  },
};
