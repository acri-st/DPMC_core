import { Client } from 'pg';
import { CONFIG } from '../../constants/config';
import { makeLogger } from '../../support/test-logger';
import { requireEnvReady } from './_env-check';

// @plan T01.4 — Database schema normalization and naming rules
// @covers EOCP-E1-05
//
// Description: This test verifies that database schemas conform to normalization principles and
//   naming conventions defined during the design phase.
// Prerequisites: e2e stack is running (start with "pnpm dashboard").
// Steps:
//   1. Inspect database schema → Schema is complete and accessible
//   2. Verify table and column names → Naming rules are respected
//   3. Check foreign keys and indexes → Referential integrity is ensured

const log = makeLogger('T01.4');

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: CONFIG.database.url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

const TABLE_NAME_RE = /^[a-z][a-zA-Z0-9]*$/;

describe('T01.4 — Database schema normalization and naming rules', () => {
  beforeAll(async () => {
    log.step('beforeAll — checking env reachability');
    await requireEnvReady();
    log.ok('env is reachable');
    log.action(`connecting to DB: ${CONFIG.database.url.replace(/:[^:@]+@/, ':***@')}`);
  });

  // @plan T01.4
  // @covers EOCP-E1-05
  it('Step 1 – schema is deployed and core tables are accessible', async () => {
    log.step('Step 1 — listing public tables');

    const tables = await withDb(async (c) => {
      const res = await c.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      );
      return res.rows.map((r) => r.tablename);
    });

    log.ok(`found ${tables.length} tables`, tables);

    const required = ['task', 'host', 'project', 'user', 'session'];
    for (const t of required) {
      const present = tables.includes(t);
      if (present) {
        log.ok(`required table "${t}" exists`);
      } else {
        log.fail(`required table "${t}" is MISSING`);
      }
      expect(tables).toContain(t);
    }
  });

  // @plan T01.4
  // @covers EOCP-E1-05
  it('Step 2 – table names follow naming conventions', async () => {
    log.step('Step 2 — checking table naming conventions');

    const tables = await withDb(async (c) => {
      const res = await c.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
      );
      return res.rows.map((r) => r.tablename);
    });

    const violations: string[] = [];
    for (const name of tables) {
      if (name.startsWith('_')) {
        log.action(`skipping internal table: ${name}`);
        continue;
      }
      const ok = TABLE_NAME_RE.test(name) || /^[a-z][a-z0-9_]*$/.test(name);
      if (!ok) {
        violations.push(name);
        log.fail(`naming violation: "${name}"`);
      } else {
        log.ok(`"${name}" — convention OK`);
      }
    }

    expect(violations).toEqual([]);
    if (violations.length === 0) log.ok('all table names conform to naming conventions');
  });

  // @plan T01.4
  // @covers EOCP-E1-05
  it('Step 3 – foreign key constraints exist on key relationship columns', async () => {
    log.step('Step 3 — checking foreign key constraints');

    const fks = await withDb(async (c) => {
      const res = await c.query<{ table_name: string; column_name: string; foreign_table: string }>(
        `SELECT
           tc.table_name,
           kcu.column_name,
           ccu.table_name AS foreign_table
         FROM information_schema.table_constraints AS tc
         JOIN information_schema.key_column_usage AS kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage AS ccu
           ON ccu.constraint_name = tc.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = 'public'`,
      );
      return res.rows;
    });

    log.action(`found ${fks.length} foreign key constraint(s)`);
    for (const fk of fks) {
      log.ok(`FK: ${fk.table_name}.${fk.column_name} → ${fk.foreign_table}`);
    }

    const sessionUserFk = fks.find(
      (r) => r.table_name === 'session' && r.foreign_table === 'user',
    );
    if (sessionUserFk) {
      log.ok('session → user FK exists');
    } else {
      log.fail('session → user FK is MISSING');
    }
    expect(sessionUserFk).toBeDefined();

    const taskProjectFk = fks.find(
      (r) => r.table_name === 'task' && r.foreign_table === 'project',
    );
    if (taskProjectFk) {
      log.ok('task → project FK exists');
    } else {
      log.fail('task → project FK is MISSING');
    }
    expect(taskProjectFk).toBeDefined();
  });
});
