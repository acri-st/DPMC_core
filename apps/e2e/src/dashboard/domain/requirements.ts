import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RequirementsFile } from './types.ts';
import type { RequirementDefinition } from './coverage.ts';

export function loadRequirements(rootDir: string): RequirementDefinition[] {
  const file = join(rootDir, 'data', 'requirements.json');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as RequirementsFile;
  return raw.requirements;
}
