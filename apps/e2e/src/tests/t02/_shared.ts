import { FIXTURES } from '../../setup/fixtures';

export const MODE_ALIASES: Record<string, string> = {
  nominal:      'Nominal',
  generic:      'Generic',
  on_demand:    'OnDemand',
  reprocessing: 'Reprocessing',
  test:         'Test',
  on_the_fly:   'OnTheFly',
  hpc:          'HPC',
};

export function toApiMode(raw: string): string {
  return MODE_ALIASES[raw.toLowerCase()] ?? raw;
}

export const PROJECT_ID          = FIXTURES.project.id;
export const PROCESSOR_VERSION_ID = FIXTURES.processorVersion.id;

// Returns [modeA, modeB] — two non-Nominal modes from the list, falling back to duplicates.
export function pickAltModes(allowed: string[]): [string, string] {
  const nonNominal = allowed.map(toApiMode).filter((m) => m !== 'Nominal');
  const a = nonNominal[0] ?? 'Test';
  const b = nonNominal[1] ?? a;
  return [a, b];
}
