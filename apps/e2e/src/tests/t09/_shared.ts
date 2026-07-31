// Minimal S3-flavoured Task Table, matching the shape S3TTAdapter parses:
// <Task_Table> with Processor_Name / Version / Acronym and a List_of_Tasks.
export function makeTaskTable(opts: {
  name: string;
  version?: string;
  acronym?: string;
  tasks?: Array<{ name: string; file: string; stage?: 'Pre' | 'Exe' | 'Post' }>;
}): string {
  const tasks = opts.tasks ?? [
    { name: 'prepare', file: 'prepare.sh', stage: 'Pre' as const },
    { name: 'process', file: 'process.sh', stage: 'Exe' as const },
  ];
  const body = tasks
    .map(
      (t) =>
        `    <Task>\n` +
        `      <Name>${t.name}</Name>\n` +
        `      <File_Name>${t.file}</File_Name>\n` +
        `      <Stage>${t.stage ?? 'Exe'}</Stage>\n` +
        `    </Task>`,
    )
    .join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Task_Table>\n` +
    `  <Processor_Name>${opts.name}</Processor_Name>\n` +
    `  <Version>${opts.version ?? '1.0'}</Version>\n` +
    `  <Acronym>${opts.acronym ?? opts.name}</Acronym>\n` +
    `  <List_of_Tasks>\n${body}\n  </List_of_Tasks>\n` +
    `</Task_Table>\n`
  );
}

// Unique per run so repeated executions never collide on the
// (processingScriptId, version) uniqueness constraint.
export function uniqueName(prefix: string): string {
  return `${prefix}-${process.hrtime.bigint().toString(36)}`;
}
