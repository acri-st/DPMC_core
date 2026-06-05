import { Worker } from 'node:worker_threads';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkerMessage } from './env-worker.ts';

const _dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
const WORKER_FILE = join(_dirname, 'env-worker.ts');

export type ComponentName = 'docker' | 'keycloak' | 'database' | 'api' | 'dispatcher' | 'worker';
export type ComponentStatus = 'stopped' | 'starting' | 'up' | 'stopping' | 'error';

export interface ComponentState {
  name: ComponentName;
  status: ComponentStatus;
  error?: string;
}

export type EnvStatus = 'idle' | 'starting' | 'up' | 'stopping' | 'error';

export interface EnvState {
  status: EnvStatus;
  components: ComponentState[];
  error?: string;
}

const ALL: ComponentName[] = ['docker', 'keycloak', 'database', 'api', 'dispatcher', 'worker'];

function blank(status: ComponentStatus): ComponentState[] {
  return ALL.map((name) => ({ name, status }));
}

let _state: EnvState = { status: 'idle', components: blank('stopped') };
let _worker: Worker | null = null;

function set(name: string, status: ComponentStatus, error?: string) {
  _state = {
    ..._state,
    components: _state.components.map((c) =>
      c.name === name ? { ...c, status, error } : c,
    ),
  };
}

function applyMessage(msg: WorkerMessage) {
  if (msg.type === 'component') {
    set(msg.name, msg.status as ComponentStatus, msg.error);
  } else if (msg.type === 'env') {
    _state = { ..._state, status: msg.status as EnvStatus, error: msg.error };
  } else if (msg.type === 'done') {
    _worker = null;
  }
}

function spawnWorker(action: 'start' | 'stop'): Promise<void> {
  return new Promise((resolve, reject) => {
    // tsx registers its loader via --import; pass TSFLAGS so the worker can use it
    const w = new Worker(WORKER_FILE, {
      workerData: { action },
      execArgv: ['--require', 'tsx/cjs'],
    });
    _worker = w;
    w.on('message', (msg: WorkerMessage) => applyMessage(msg));
    w.on('error', (err) => { _worker = null; reject(err); });
    w.on('exit', () => { _worker = null; resolve(); });
  });
}

export function getEnvState(): EnvState {
  return _state;
}

export function startEnv(): Promise<void> {
  if (_state.status === 'starting' || _state.status === 'up') return Promise.resolve();
  _state = { status: 'starting', components: blank('stopped') };
  return spawnWorker('start');
}

export function stopEnv(): Promise<void> {
  if (_state.status === 'idle' || _state.status === 'stopping') return Promise.resolve();
  _state = { ..._state, status: 'stopping' };
  _worker?.terminate();
  _worker = null;
  return spawnWorker('stop');
}
