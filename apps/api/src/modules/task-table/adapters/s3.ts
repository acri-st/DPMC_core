import { XMLParser } from 'fast-xml-parser';

import type {
  CanonicalIR,
  ContainerRuntime,
  IrExecutable,
} from '../canonical-ir';
import { TtParseError, type TtAdapter } from './base';

interface S3TaskTable {
  Task_Table?: {
    Processor_Name?: string;
    Version?: string;
    Acronym?: string;
    List_of_Tasks?: { Task?: S3Task | S3Task[] };
  };
}

interface S3Task {
  Name?: string;
  File_Name?: string;
  Stage?: 'Pre' | 'Exe' | 'Post';
}

export class S3TTAdapter implements TtAdapter {
  readonly name = 's3';

  parse(content: string): CanonicalIR {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: false,
    });
    const doc = parser.parse(content) as S3TaskTable;
    const tt = doc.Task_Table;
    if (!tt) throw new TtParseError('Missing <Task_Table> root');
    const acronym = tt.Acronym ?? tt.Processor_Name ?? '';
    const name = tt.Processor_Name ?? acronym;
    const version = tt.Version ?? '0.0';
    if (!name || !version) {
      throw new TtParseError('Missing Processor_Name or Version');
    }
    const tasksRaw = tt.List_of_Tasks?.Task;
    const tasks = Array.isArray(tasksRaw)
      ? tasksRaw
      : tasksRaw
        ? [tasksRaw]
        : [];
    const runtime: ContainerRuntime = 'None';

    const executables: IrExecutable[] = tasks.map((t, i) => ({
      scriptType: 'Bash',
      stage: (t.Stage as 'Pre' | 'Exe' | 'Post') ?? 'Exe',
      path: t.File_Name ?? '',
      name: t.Name ?? `task-${i}`,
      sequence: i,
    }));

    return {
      processingScript: { name, acronym },
      processingScriptVersion: {
        version,
        runtime,
        requiredCpu: 1,
        requiredRam: 0n,
        requiredDisk: 0n,
      },
      executables,
      processingChain: { name: `${acronym}-chain` },
    };
  }
}
