import { createServer as createHttpServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the e2e app root (best-effort, no hard dependency)
{
  const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const stripped = line.trim();
      if (!stripped || stripped.startsWith('#')) continue;
      const eq = stripped.indexOf('=');
      if (eq === -1) continue;
      const key = stripped.slice(0, eq).trim();
      const val = stripped.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
}

import { createServer as createViteServer } from 'vite';

import { executeRun } from './domain/runner.ts';
import { loadCatalog } from './domain/catalog.ts';
import { loadRequirements } from './domain/requirements.ts';
import { buildCoverageState } from './domain/state.ts';
import { getEnvState, startEnv, stopEnv } from './domain/env-manager.ts';
import type { RunRequest, RunArtifact } from './domain/types.ts';
import type { RunScope } from './domain/commands.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');
const artifactsDir = join(rootDir, 'artifacts');
const currentRunFile = join(artifactsDir, 'current-run.json');
const port = Number(process.env.PORT ?? '4174');

let running = false;

async function main() {
  // Tear down on exit
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      console.log(`\n[dashboard] received ${sig}, shutting down environment…`);
      stopEnv().finally(() => process.exit(0));
    });
  }

  const vite = await createViteServer({
    root: rootDir,
    appType: 'custom',
    server: {
      middlewareMode: true,
      hmr: false,
    },
  });
  const indexHtml = readFileSync(join(rootDir, 'index.html'), 'utf8');

  const server = createHttpServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end('Missing URL');
      return;
    }

    if (req.url === '/api/state' && req.method === 'GET') {
      const snapshot = getSnapshot();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(snapshot));
      return;
    }

    if (req.url === '/api/env' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(getEnvState()));
      return;
    }

    if (req.url === '/api/env/restart' && req.method === 'POST') {
      stopEnv().then(() => startEnv()).catch((err: unknown) => {
        console.error('[dashboard] env restart error:', err);
      });
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url === '/api/run' && req.method === 'POST') {
      try {
        const body = await readJsonBody<RunRequest>(req);
        running = true;
        const scope = body.scope as RunScope;
        const { artifact } = await executeRun(rootDir, scope);
        running = false;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, artifact }));
      } catch (error) {
        running = false;
        const message = error instanceof Error ? error.message : String(error);
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: message }));
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      const html = await vite.transformIndexHtml('/', indexHtml);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    vite.middlewares(req, res, () => {
      res.writeHead(404).end('Not found');
    });
  });

  server.listen(port, () => {
    console.log(`DPMC Test Dashboard running on http://localhost:${port}`);
    // Boot the mock environment now that the server is accepting requests
    startEnv().catch((err: unknown) => {
      console.error('[dashboard] env startup error:', err);
    });
  });
}

function getSnapshot() {
  const catalog = loadCatalog(rootDir);
  const requirements = loadRequirements(rootDir);
  const lastRun = readCurrentRun();
  const coverage = buildCoverageState({ requirements, catalog, lastRun });
  return {
    running,
    catalog,
    requirements,
    coverage,
    lastRun,
  };
}

function readCurrentRun(): RunArtifact | null {
  if (!existsSync(currentRunFile)) {
    return null;
  }

  return JSON.parse(readFileSync(currentRunFile, 'utf8')) as RunArtifact;
}

function readJsonBody<T>(req: IncomingMessage) {
  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
