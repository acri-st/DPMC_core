export type RunScope =
  | { type: 'all' }
  | { type: 'file'; value: string }
  | { type: 'files'; values: string[] }
  | { type: 'test'; value: string };

export function buildJestCommand(scope: RunScope): string[] {
  if (scope.type === 'all') {
    return ['jest', '--json'];
  }
  if (scope.type === 'file') {
    return ['jest', '--json', '--testPathPattern', scope.value.replace(/\./g, '\\.').replace(/\//g, '/')];
  }
  if (scope.type === 'files') {
    const pattern = scope.values.map((v) => v.replace(/\./g, '\\.')).join('|');
    return ['jest', '--json', '--testPathPattern', pattern];
  }
  return ['jest', '--json', '--testNamePattern', scope.value];
}
