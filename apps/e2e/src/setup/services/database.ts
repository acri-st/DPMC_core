import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { CONFIG } from '../../constants/config';

async function dropPublicSchema() {
  const client = new Client({ connectionString: CONFIG.database.url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }
}

// prisma@7 dropped --skip-seed and always invokes the seed script on reset.
// The repo seed pulls from a remote legacy DB and is unusable for tests, so
// we drop the schema ourselves then run `migrate deploy`.
export const database = {
  async reset() {
    await dropPublicSchema();
    execFileSync(
      'pnpm',
      ['--filter', '@dpmc/prisma', 'exec', 'prisma', 'migrate', 'deploy'],
      {
        cwd: CONFIG.paths.rootDir,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: CONFIG.database.url },
      },
    );
  },
};
