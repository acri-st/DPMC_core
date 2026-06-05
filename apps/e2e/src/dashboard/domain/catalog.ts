import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TestCatalogFile, TestDefinitionEntry } from './types.ts';

export function loadCatalog(rootDir: string): TestDefinitionEntry[] {
  const file = join(rootDir, 'data', 'catalog.json');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as TestCatalogFile;
  return raw.tests;
}
