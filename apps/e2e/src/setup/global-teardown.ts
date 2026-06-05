import { CONFIG } from '../constants/config';
import { api } from './services/api';
import { dispatcher } from './services/dispatcher';
import { docker } from './services/docker';
import { workerProcess } from './services/worker-process';

export default async function globalTeardown() {
  if (CONFIG.flags.useExternalStack) return;
  if (CONFIG.flags.keepStackAfterRun) {
    console.log('[e2e] E2E_KEEP_STACK=1 — leaving stack running');
    return;
  }
  console.log('[e2e] stopping worker...');
  workerProcess.stopAll();

  console.log('[e2e] stopping dispatcher...');
  dispatcher.stop();

  console.log('[e2e] stopping API...');
  api.stop();

  console.log('[e2e] tearing down docker stack...');
  docker.down();
}
