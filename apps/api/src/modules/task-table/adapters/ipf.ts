import { XMLParser } from 'fast-xml-parser';

import type {
  ChainEdgeIr,
  ChainIr,
  ChainNodeIr,
  ChainParamIr,
} from '../chain-ir';
import { TtParseError } from './base';

interface IpfTaskTable {
  Ipf_Task_Table?: {
    Processor_Name?: string;
    Version?: string;
    Min_Disk_Space?: string | { '#text': string };
    Max_Time?: string | { '#text': string };
    List_of_Dyn_ProcParams?: { Dyn_ProcParam?: IpfDynParam | IpfDynParam[] };
    List_of_Pools?: { Pool?: IpfPool | IpfPool[] };
  };
}

interface IpfDynParam {
  Param_Name?: string;
  Param_Type?: string;
  Param_Default?: string;
}

interface IpfPool {
  List_of_Tasks?: { Task?: IpfTask | IpfTask[] };
}

interface IpfTask {
  Name?: string;
  Version?: string;
  File_Name?: string;
  List_of_Inputs?: { Input?: IpfInput | IpfInput[] };
  List_of_Outputs?: { Output?: IpfOutput | IpfOutput[] };
}

interface IpfInput {
  List_of_Alternatives?: {
    Alternative?: IpfAlternative | IpfAlternative[];
  };
}

interface IpfAlternative {
  File_Type?: string;
}

interface IpfOutput {
  Type?: string;
}

const arr = <T>(v: T | T[] | undefined): T[] =>
  Array.isArray(v) ? v : v ? [v] : [];

const sanitizeAcronym = (raw: string): string =>
  raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);

/**
 * ESA IPF Task Table (the format produced by Sentinel/EarthCARE-style
 * processors). Each <Task> becomes a node; edges are inferred by matching
 * an upstream task's <Output><Type> against a downstream task's
 * <Input><Alternative><File_Type>. Dyn_ProcParams are surfaced as chain
 * parameters so the LaunchTaskDialog can expose them.
 */
export function parseIpfTaskTable(content: string): ChainIr {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: false,
  });
  const doc = parser.parse(content) as IpfTaskTable;
  const tt = doc.Ipf_Task_Table;
  if (!tt) throw new TtParseError('Missing <Ipf_Task_Table> root');
  const chainName = tt.Processor_Name?.trim();
  if (!chainName) throw new TtParseError('Missing <Processor_Name>');

  const tasks: IpfTask[] = [];
  for (const pool of arr(tt.List_of_Pools?.Pool)) {
    for (const task of arr(pool.List_of_Tasks?.Task)) {
      tasks.push(task);
    }
  }
  if (tasks.length === 0) {
    throw new TtParseError('No <Task> entries found in any <Pool>');
  }

  const acronymsSeen = new Set<string>();
  const nodes: ChainNodeIr[] = tasks.map((t) => {
    const rawName = t.Name?.trim() ?? '';
    if (!rawName) throw new TtParseError('Task is missing <Name>');
    let acronym = sanitizeAcronym(rawName);
    let suffix = 2;
    while (acronymsSeen.has(acronym)) {
      acronym = sanitizeAcronym(`${rawName}_${suffix++}`);
    }
    acronymsSeen.add(acronym);

    const inputTypes = arr(t.List_of_Inputs?.Input).flatMap((i) =>
      arr(i.List_of_Alternatives?.Alternative)
        .map((a) => a.File_Type?.trim())
        .filter((s): s is string => Boolean(s)),
    );
    const outputTypes = arr(t.List_of_Outputs?.Output)
      .map((o) => o.Type?.trim())
      .filter((s): s is string => Boolean(s));

    return {
      acronym,
      name: rawName,
      scriptType: 'Bash',
      stage: 'Exe',
      path: t.File_Name?.trim() ?? '',
      runtime: 'None',
      requiredCpu: 1,
      requiredRamBytes: '0',
      requiredDiskBytes: '0',
      inputTypes,
      outputTypes,
    };
  });

  // Infer edges: for each output type, link the producer to every consumer
  // that lists the same type as an input. Skips self-edges.
  const edges: ChainEdgeIr[] = [];
  const seenEdges = new Set<string>();
  for (const producer of nodes) {
    for (const outType of producer.outputTypes) {
      for (const consumer of nodes) {
        if (consumer.acronym === producer.acronym) continue;
        if (!consumer.inputTypes.includes(outType)) continue;
        const key = `${producer.acronym}->${consumer.acronym}:${outType}`;
        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        edges.push({
          parentAcronym: producer.acronym,
          childAcronym: consumer.acronym,
          matchType: outType,
        });
      }
    }
  }

  const parameters: ChainParamIr[] = arr(
    tt.List_of_Dyn_ProcParams?.Dyn_ProcParam,
  )
    .map((p): ChainParamIr | null => {
      const key = p.Param_Name?.trim();
      if (!key) return null;
      const type =
        p.Param_Type?.toLowerCase() === 'integer' ? 'number' : 'string';
      const rawDefault = p.Param_Default?.trim();
      const def: string | number | undefined =
        rawDefault === undefined || rawDefault === ''
          ? undefined
          : type === 'number'
            ? Number(rawDefault)
            : rawDefault;
      return { key, label: key, type, default: def };
    })
    .filter((p): p is ChainParamIr => p !== null);

  return {
    name: chainName,
    comment: `Imported from IPF Task Table (${tasks.length} task${
      tasks.length === 1 ? '' : 's'
    }).`,
    nodes,
    edges,
    parameters,
  };
}
