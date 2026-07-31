import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env before reading any env var. Variables already set in the shell take precedence.
try {
  const envPath = resolve(__dirname, '../../.env');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
} catch { /* .env is optional */ }

const ROOT_DIR = resolve(__dirname, '../../../..');
const E2E_DIR = resolve(__dirname, '../..');

function env(key: string, fallback: string) {
  return process.env[key] ?? fallback;
}

function envNumber(key: string, fallback: number) {
  const raw = process.env[key];
  return raw ? Number(raw) : fallback;
}

function envFlag(key: string) {
  return process.env[key] === '1';
}

const DB_PORT = envNumber('DB_PORT', 5434);
const API_PORT = envNumber('API_PORT', 3001);
const KEYCLOAK_PORT = envNumber('KEYCLOAK_PORT', 8081);

const DATABASE_URL = env(
  'DATABASE_URL',
  `postgresql://dpmc:dpmc@127.0.0.1:${DB_PORT}/dpmc_test`,
);
const API_URL = env('API_URL', `http://127.0.0.1:${API_PORT}/api`);
const KEYCLOAK_URL = env(
  'KEYCLOAK_URL',
  `http://127.0.0.1:${KEYCLOAK_PORT}`,
);

// Test-only fixed secrets so jest runs are deterministic across machines.
// SESSION_ENCRYPTION_KEY is base64-encoded and must decode to exactly 32
// bytes (CryptoService uses AES-256-GCM). WORKER_REGISTRATION_TOKEN must
// be ≥ 20 characters (config schema).
const SESSION_ENCRYPTION_KEY = env(
  'SESSION_ENCRYPTION_KEY',
  'ZHBtYy1lMmUtdGVzdC1zZWNyZXQtMzJieXRlcyEhISE=',
);
const WORKER_REGISTRATION_TOKEN = env(
  'WORKER_REGISTRATION_TOKEN',
  'e2e-worker-token-must-be-20-chars-minimum',
);

export const CONFIG = {
  paths: {
    rootDir: ROOT_DIR,
    e2eDir: E2E_DIR,
    logDir: resolve(E2E_DIR, '.test-logs'),
    composeFile: resolve(E2E_DIR, 'docker-compose.yml'),
  },
  docker: {
    project: 'dpmc-e2e',
  },
  database: {
    port: DB_PORT,
    url: DATABASE_URL,
  },
  api: {
    protocol: 'http',
    host: '127.0.0.1',
    port: API_PORT,
    prefix: 'api',
    url: API_URL,
  },
  keycloak: {
    port: KEYCLOAK_PORT,
    serverUrl: KEYCLOAK_URL,
    realm: env('KEYCLOAK_REALM', 'dpmc'),
    clientId: env('KEYCLOAK_CLIENT_ID', 'dpmc-api'),
    clientSecret: env('KEYCLOAK_CLIENT_SECRET', 'keycloak-development-secret'),
  },
  frontend: {
    url: env('FRONTEND_URL', 'http://127.0.0.1:5173'),
  },
  session: {
    encryptionKey: SESSION_ENCRYPTION_KEY,
    cookieName: env('SESSION_COOKIE_NAME', 'dpmc.sid'),
  },
  worker: {
    registrationToken: WORKER_REGISTRATION_TOKEN,
    headerName: 'X-Worker-Token',
  },
  // The e2e stack has no real object store; these placeholders only satisfy the
  // API's config schema so it can boot. No test in the suite exercises S3 I/O.
  s3: {
    endpoint: env('S3_ENDPOINT', 'http://127.0.0.1:9000'),
    region: env('S3_REGION', 'us-east-1'),
    accessKey: env('S3_ACCESS_KEY', 'e2e-access-key'),
    secretKey: env('S3_SECRET_KEY', 'e2e-secret-key'),
    bucket: env('S3_BUCKET', 'e2e-bucket'),
  },
  cookies: {
    maxAgeSeconds: '604800',
    domain: 'localhost',
  },
  flags: {
    useExternalStack: envFlag('E2E_EXTERNAL'),
    keepStackAfterRun: envFlag('E2E_KEEP_STACK'),
  },
} as const;

// Environment variables injected into the spawned API process. Projection of
// CONFIG into the NestJS app's expected NodeJS.ProcessEnv shape.
export function buildApiEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'test',
    API_PROTOCOL: CONFIG.api.protocol,
    API_HOST: CONFIG.api.host,
    API_PORT: String(CONFIG.api.port),
    API_PREFIX: CONFIG.api.prefix,
    API_URL: CONFIG.api.url,
    DATABASE_URL: CONFIG.database.url,
    FRONTEND_URL: CONFIG.frontend.url,
    KEYCLOAK_URL: CONFIG.keycloak.serverUrl,
    KEYCLOAK_REALM: CONFIG.keycloak.realm,
    KEYCLOAK_CLIENT_ID: CONFIG.keycloak.clientId,
    KEYCLOAK_CLIENT_SECRET: CONFIG.keycloak.clientSecret,
    SESSION_ENCRYPTION_KEY: CONFIG.session.encryptionKey,
    SESSION_COOKIE_NAME: CONFIG.session.cookieName,
    WORKER_REGISTRATION_TOKEN: CONFIG.worker.registrationToken,
    S3_ENDPOINT: CONFIG.s3.endpoint,
    S3_REGION: CONFIG.s3.region,
    S3_ACCESS_KEY: CONFIG.s3.accessKey,
    S3_SECRET_KEY: CONFIG.s3.secretKey,
    S3_BUCKET: CONFIG.s3.bucket,
    COOKIE_DOMAIN: CONFIG.cookies.domain,
    COOKIE_MAX_AGE: CONFIG.cookies.maxAgeSeconds,
    WORKER_OFFLINE_THRESHOLD_S: '15',
    SCHEDULER_STALE_THRESHOLD_S: '10',
  };
}
