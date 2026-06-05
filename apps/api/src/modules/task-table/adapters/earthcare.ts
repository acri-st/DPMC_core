import { XMLParser } from 'fast-xml-parser';

import type { CanonicalIR, IrExecutable } from '../canonical-ir';
import { TtParseError, type TtAdapter } from './base';

interface EcTaskTable {
  TaskTable?: {
    Header?: {
      Acronym?: string;
      ProcessorName?: string;
      ProcessorVersion?: string;
    };
    Tasks?: { Task?: EcTask | EcTask[] };
  };
}

interface EcTask {
  Name?: string;
  Executable?: string;
  Type?: 'pre' | 'exe' | 'post';
}

const STAGE_MAP: Record<string, 'Pre' | 'Exe' | 'Post'> = {
  pre: 'Pre',
  exe: 'Exe',
  post: 'Post',
};

export class EarthCAREAdapter implements TtAdapter {
  readonly name = 'earthcare';

  parse(content: string): CanonicalIR {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: false,
    });
    const doc = parser.parse(content) as EcTaskTable;
    const tt = doc.TaskTable;
    if (!tt) throw new TtParseError('Missing <TaskTable> root');
    const acronym = tt.Header?.Acronym ?? '';
    const name = tt.Header?.ProcessorName ?? acronym;
    const version = tt.Header?.ProcessorVersion ?? '0.0';
    if (!name || !acronym)
      throw new TtParseError('Missing Header.Acronym or ProcessorName');
    const tasksRaw = tt.Tasks?.Task;
    const tasks = Array.isArray(tasksRaw)
      ? tasksRaw
      : tasksRaw
        ? [tasksRaw]
        : [];

    const executables: IrExecutable[] = tasks.map((t, i) => ({
      scriptType: 'Bash',
      stage: STAGE_MAP[t.Type ?? 'exe'] ?? 'Exe',
      path: t.Executable ?? '',
      name: t.Name ?? `ec-${i}`,
      sequence: i,
    }));

    return {
      processingScript: { name, acronym },
      processingScriptVersion: {
        version,
        runtime: 'None',
        requiredCpu: 1,
        requiredRam: 0n,
        requiredDisk: 0n,
      },
      executables,
      processingChain: { name: `${acronym}-chain` },
    };
  }
}
