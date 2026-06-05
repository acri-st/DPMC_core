// This file runs in a worker_thread — it owns the blocking lifecycle calls
// and posts status updates back to the main thread via parentPort.

import { parentPort, workerData } from 'node:worker_threads';
import { hostname } from 'node:os';

import { api } from '../../setup/services/api';
import { database } from '../../setup/services/database';
import { dispatcher } from '../../setup/services/dispatcher';
import { docker } from '../../setup/services/docker';
import { keycloak } from '../../setup/services/keycloak';
import { seed } from '../../setup/services/seed';
import { workerProcess } from '../../setup/services/worker-process';
import { CONFIG } from '../../constants/config';

export type WorkerMessage =
  | { type: 'component'; name: string; status: string; error?: string }
  | { type: 'env'; status: string; error?: string }
  | { type: 'done' };

function post(msg: WorkerMessage) {
  parentPort?.postMessage(msg);
}

const action = (workerData as { action: 'start' | 'stop' }).action;

// Run a named step, posting starting/up/error around it.
// Throws on failure so callers can abort the sequence.
async function step(name: string, fn: () => void | Promise<void>) {
  post({ type: 'component', name, status: 'starting' });
  try {
    await fn();
    post({ type: 'component', name, status: 'up' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: 'component', name, status: 'error', error: message });
    throw err;
  }
}

async function start() {
  post({ type: 'env', status: 'starting' });

  try {
    // Phase 1 — Docker (everything else depends on it)
    await step('docker', () => { docker.up(); });

    // Phase 2 — Keycloak + DB reset in parallel (both only need Docker)
    await Promise.all([
      step('keycloak', () => keycloak.waitReady(120_000)),
      step('database', async () => { await database.reset(); await seed.run(); }),
    ]);

    // Phase 3 — API (needs DB + Keycloak)
    await step('api', async () => { api.stop(); await api.start(); });

    // Phase 4 — Dispatcher + Worker in parallel (both need the API)
    await Promise.all([
      step('dispatcher', async () => {
        dispatcher.start();
        await dispatcher.waitHealthy(CONFIG.api.url, 20_000);
      }),
      step('worker', async () => {
        workerProcess.start('dashboard');
        await workerProcess.waitRegistered(CONFIG.api.url, hostname(), '', 20_000);
      }),
    ]);

    post({ type: 'env', status: 'up' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: 'env', status: 'error', error: message });
  }

  post({ type: 'done' });
}

async function stop() {
  post({ type: 'env', status: 'stopping' });
  try {
    // Stop services in reverse order — best-effort, don't abort on failure
    for (const [name, fn] of [
      ['worker',     () => { workerProcess.stopAll(); }] as const,
      ['dispatcher', () => { dispatcher.stop(); }] as const,
      ['api',        () => { api.stop(); }] as const,
      ['docker',     () => { docker.down(); }] as const,
    ]) {
      post({ type: 'component', name, status: 'stopping' });
      try { fn(); } catch { /* best-effort */ }
      post({ type: 'component', name, status: 'stopped' });
    }
    for (const name of ['database', 'keycloak']) {
      post({ type: 'component', name, status: 'stopped' });
    }
  } catch { /* best-effort */ }
  post({ type: 'env', status: 'idle' });
  post({ type: 'done' });
}

if (action === 'start') start();
else if (action === 'stop') stop();
