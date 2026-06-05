import { CONFIG } from '../constants/config';
import { api } from './services/api';
import { database } from './services/database';
import { dispatcher } from './services/dispatcher';
import { docker } from './services/docker';
import { keycloak } from './services/keycloak';
import { seed } from './services/seed';
import { workerProcess } from './services/worker-process';

export default async function globalSetup() {
  if (CONFIG.flags.useExternalStack) return;

  console.log('[e2e] starting docker compose stack...');
  docker.up();

  console.log('[e2e] waiting for keycloak realm to be ready...');
  await keycloak.waitReady();

  console.log('[e2e] resetting database schema...');
  await database.reset();

  console.log('[e2e] seeding fixtures...');
  await seed.run();

  console.log('[e2e] starting API...');
  api.stop();
  await api.start();

  console.log('[e2e] starting dispatcher...');
  dispatcher.start();
  await dispatcher.waitHealthy(CONFIG.api.url, 20_000);

  console.log('[e2e] starting worker...');
  workerProcess.start('e2e');

  console.log('[e2e] ready');
}
