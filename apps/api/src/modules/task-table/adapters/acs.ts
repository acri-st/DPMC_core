import { XMLParser } from 'fast-xml-parser';

import type {
  TaskTableConfig,
  TaskTableInput,
  TaskTableOutput,
  TaskTableTask,
} from '@/modules/worker/job-order';

import { TtParseError } from './base';

/**
 * Adapter for the old-ACS CryoSat Task Table format (root `<Task_Table>`,
 * e.g. the CryoSat Ocean Baseline-D deliveries). Unlike the Sentinel-style
 * `ipf` adapter (root `<Ipf_Task_Table>`, one node per <Task>), an ACS task
 * table maps to ONE chain node whose pools become sequenced executables of a
 * single ProcessingScript, and the full transcription is kept as the node's
 * `configuration.taskTable` — the contract consumed by the job-order
 * generator (see modules/worker/job-order.ts).
 */

export interface AcsParsedTaskTable {
  /** File the table was parsed from (for error/warning context). */
  sourceName: string;
  processorName: string;
  version: string;
  minDiskSpaceMB: number;
  maxTimeSec: number;
  /** Private_Config Cfg_File path, as written in the XML (not re-rooted). */
  configFileRaw: string;
  /** Private_Config Cfg_File Version (e.g. "3.0") — used to locate the
   * per-config-space file `Alternate_<space>_<version>.xml`. */
  configFileVersion: string;
  configSpaces: string[];
  tasks: AcsParsedTask[];
}

export interface AcsParsedTask {
  name: string;
  version: string;
  critical: boolean;
  criticalityLevel: number;
  killingSignal: number;
  /** Binary path as written in the XML (not re-rooted). */
  fileNameRaw: string;
  inputs: TaskTableInput[];
  outputs: TaskTableOutput[];
}

export interface AcsChainNodePlan {
  acronym: string;
  sourceName: string;
  version: string;
  taskTable: TaskTableConfig;
  executables: Array<{
    scriptType: 'Bash' | 'Python' | 'Binary';
    stage: 'Exe';
    path: string;
    name: string;
    sequence: number;
  }>;
  outputs: Array<{
    role: string;
    localName: string;
    contentType: string;
    productTypeAcronym: string;
  }>;
  requiredDiskBytes: string;
  /** DB input types, flattened over tasks and alternatives. */
  dbInputTypes: string[];
  /** DB-destination output types (deduplicated). */
  dbOutputTypes: string[];
  /** DB inputs produced by no other imported table (aux data etc.). */
  externalInputTypes: string[];
  suggestedImageUrl: string | null;
}

export interface AcsChainEdgePlan {
  parentAcronym: string;
  childAcronym: string;
  dependencyMode: 'OnSuccess' | 'OnCompletion';
  /** Product types the edge was inferred from. */
  viaTypes: string[];
}

export interface AcsChainPlan {
  name: string;
  nodes: AcsChainNodePlan[];
  edges: AcsChainEdgePlan[];
  /** Longest common source prefix stripped by re-rooting (informational). */
  detectedSourceRoot: string | null;
  warnings: string[];
}

const HARBOR_PREFIX = 'harbor.shared.acrist-services.com/dsy/damps/dpmc/';

// CryoSat-delivery knowledge, kept in this (CryoSat-specific) adapter: the
// EE product-name prefix used for job-order stems, and the static-aux
// volume the runtime images expect (resolved against the API's
// DPMC_STATIC_VOLUMES map at dispatch time).
const PRODUCT_NAME_PREFIX = 'CS_OPER';
export const CRYOSAT_STATIC_VOLUMES = [
  { name: 'cryosat-sad', target: '/data/cryosat-sad', readOnly: true },
];

const arr = <T>(v: T | T[] | undefined): T[] =>
  Array.isArray(v) ? v : v !== undefined && v !== null ? [v] : [];

const text = (v: unknown): string => {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  // fast-xml-parser wraps attribute-bearing elements: text is under '#text'.
  if (v !== null && typeof v === 'object')
    return text((v as { '#text'?: unknown })['#text']);
  return '';
};

const num = (v: unknown, fallback = 0): number => {
  const n = Number(text(v));
  return Number.isFinite(n) ? n : fallback;
};

interface XmlAlternative {
  Order?: unknown;
  Origin?: unknown;
  Retrieval_Mode?: unknown;
  T0?: unknown;
  T1?: unknown;
  File_Type?: unknown;
}

interface XmlInput {
  Mandatory?: unknown;
  List_of_Alternatives?: { Alternative?: XmlAlternative | XmlAlternative[] };
}

interface XmlOutput {
  Destination?: unknown;
  File_Type?: unknown;
}

interface XmlTask {
  Name?: unknown;
  Version?: unknown;
  Critical?: unknown;
  Criticality_Level?: unknown;
  File_Name?: unknown;
  List_of_Inputs?: { Input?: XmlInput | XmlInput[] };
  List_of_Outputs?: { Output?: XmlOutput | XmlOutput[] };
}

interface XmlPool {
  Killing_Signal?: unknown;
  List_of_Tasks?: { Task?: XmlTask | XmlTask[] };
}

interface XmlTaskTable {
  Task_Table?: {
    Processor_Name?: unknown;
    Version?: unknown;
    Min_Disk_Space?: unknown;
    Max_Time?: unknown;
    Private_Config?: {
      List_of_Cfg_Files?: {
        Cfg_File?:
          | { Version?: unknown; File_Name?: unknown }
          | Array<{ Version?: unknown; File_Name?: unknown }>;
      };
    };
    List_of_Config_Spaces?: { Config_Space?: unknown };
    List_of_Pools?: { Pool?: XmlPool | XmlPool[] };
  };
}

/** True when the content is an old-ACS `<Task_Table>` document. */
export function isAcsTaskTable(content: string): boolean {
  return (
    /<Task_Table[\s>]/.test(content) && !/<Ipf_Task_Table[\s>]/.test(content)
  );
}

function parseInput(input: XmlInput): TaskTableInput {
  const mandatory = text(input.Mandatory).toLowerCase() !== 'no';
  const alternatives = arr(input.List_of_Alternatives?.Alternative).map(
    (a) => ({
      order: num(a.Order),
      fileType: text(a.File_Type),
      origin: text(a.Origin),
      retrievalMode: text(a.Retrieval_Mode),
      t0: num(a.T0),
      t1: num(a.T1),
    }),
  );
  if (alternatives.length === 0)
    throw new TtParseError('Input has no <Alternative>');

  if (alternatives.length === 1) {
    const a = alternatives[0];
    return {
      fileType: a.fileType,
      origin: a.origin,
      retrievalMode: a.retrievalMode,
      t0: a.t0,
      t1: a.t1,
      mandatory,
    };
  }

  const sorted = alternatives.slice().sort((a, b) => a.order - b.order);
  const sameType = sorted.every((a) => a.fileType === sorted[0].fileType);
  return {
    ...(sameType ? { fileType: sorted[0].fileType } : {}),
    origin: sorted[0].origin,
    mandatory,
    alternatives: sorted.map((a) => ({
      order: a.order,
      ...(sameType ? {} : { fileType: a.fileType }),
      retrievalMode: a.retrievalMode,
      t0: a.t0,
      t1: a.t1,
    })),
  };
}

export function parseAcsTaskTable(
  content: string,
  sourceName = 'task-table.xml',
): AcsParsedTaskTable {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: false,
  });
  let doc: XmlTaskTable;
  try {
    doc = parser.parse(content) as XmlTaskTable;
  } catch (err) {
    throw new TtParseError(
      `${sourceName}: invalid XML — ${(err as Error).message}`,
    );
  }
  const tt = doc.Task_Table;
  if (!tt)
    throw new TtParseError(`${sourceName}: missing <Task_Table> root element`);
  const processorName = text(tt.Processor_Name);
  if (!processorName)
    throw new TtParseError(`${sourceName}: missing <Processor_Name>`);

  const cfgFiles = arr(tt.Private_Config?.List_of_Cfg_Files?.Cfg_File);
  const cfgFile = cfgFiles[0];

  const tasks: AcsParsedTask[] = [];
  for (const pool of arr(tt.List_of_Pools?.Pool)) {
    const killingSignal = num(pool.Killing_Signal, 15);
    for (const task of arr(pool.List_of_Tasks?.Task)) {
      const name = text(task.Name);
      if (!name) throw new TtParseError(`${sourceName}: <Task> without <Name>`);
      tasks.push({
        name,
        version: text(task.Version),
        critical: text(task.Critical).toLowerCase() !== 'false',
        criticalityLevel: num(task.Criticality_Level, 1),
        killingSignal,
        fileNameRaw: text(task.File_Name),
        inputs: arr(task.List_of_Inputs?.Input).map(parseInput),
        outputs: arr(task.List_of_Outputs?.Output).map((o) => ({
          fileType: text(o.File_Type),
          destination: text(o.Destination),
        })),
      });
    }
  }
  if (tasks.length === 0)
    throw new TtParseError(`${sourceName}: no <Task> entries in any <Pool>`);

  return {
    sourceName,
    processorName,
    version: text(tt.Version),
    minDiskSpaceMB: num(tt.Min_Disk_Space, 1024),
    maxTimeSec: num(tt.Max_Time, 0),
    configFileRaw: text(cfgFile?.File_Name),
    configFileVersion: text(cfgFile?.Version),
    configSpaces: arr(tt.List_of_Config_Spaces?.Config_Space).map(text),
    tasks,
  };
}

/**
 * Re-root a delivery path onto `installRoot`: everything before the
 * `/Binaries/` package segment is replaced (deliveries reference their build
 * host, e.g. `/exports/dpmc/...` or `/mount/psi/.../dev`, while the baked
 * images ship the packages under /dpmc/scripts/...). Paths without a
 * `/Binaries/` segment are returned unchanged.
 */
export function rerootPath(path: string, installRoot: string | null): string {
  if (!installRoot) return path;
  const idx = path.indexOf('/Binaries/');
  if (idx < 0) return path;
  return installRoot.replace(/\/$/, '') + path.slice(idx);
}

function sourceRootOf(path: string): string | null {
  const idx = path.indexOf('/Binaries/');
  return idx > 0 ? path.slice(0, idx) : null;
}

const kebab = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function scriptTypeOf(path: string): 'Bash' | 'Python' | 'Binary' {
  if (path.endsWith('.py')) return 'Python';
  if (path.endsWith('.sh')) return 'Bash';
  return 'Binary';
}

function suggestImage(paths: string[]): string | null {
  const joined = paths.join(' ');
  if (joined.includes('COP_IPF1')) return `${HARBOR_PREFIX}cryosat-ocean-ipf1`;
  if (joined.includes('COP_IPF2')) return `${HARBOR_PREFIX}cryosat-ocean-ipf2`;
  return null;
}

function dbInputTypesOf(tt: AcsParsedTaskTable): string[] {
  const types = new Set<string>();
  for (const task of tt.tasks) {
    for (const input of task.inputs) {
      if (input.origin !== 'DB') continue;
      if (input.fileType) types.add(input.fileType);
      for (const alt of input.alternatives ?? [])
        if (alt.fileType) types.add(alt.fileType);
    }
  }
  return [...types];
}

function dbOutputTypesOf(tt: AcsParsedTaskTable): string[] {
  const types = new Set<string>();
  for (const task of tt.tasks)
    for (const output of task.outputs)
      if (output.destination === 'DB' && output.fileType)
        types.add(output.fileType);
  return [...types];
}

/**
 * Dependency mode for an edge inferred from `viaTypes`: when every consuming
 * input on the child is optional or one of several ordered alternatives (the
 * P2P_GOP merge shape — "at least one mode product"), the child should run
 * once the parents are terminal rather than be skipped on a parent failure.
 */
function edgeMode(
  child: AcsParsedTaskTable,
  viaTypes: string[],
): 'OnSuccess' | 'OnCompletion' {
  const consuming: TaskTableInput[] = [];
  for (const task of child.tasks) {
    for (const input of task.inputs) {
      if (input.origin !== 'DB') continue;
      const types = [
        ...(input.fileType ? [input.fileType] : []),
        ...(input.alternatives ?? []).flatMap((a) =>
          a.fileType ? [a.fileType] : [],
        ),
      ];
      if (types.some((t) => viaTypes.includes(t))) consuming.push(input);
    }
  }
  const allTolerant = consuming.every(
    (input) =>
      input.mandatory === false || (input.alternatives?.length ?? 0) > 1,
  );
  return consuming.length > 0 && allTolerant ? 'OnCompletion' : 'OnSuccess';
}

export function buildAcsChainPlan(
  files: Array<{ name: string; content: string }>,
  options: { installRoot?: string | null } = {},
): AcsChainPlan {
  const warnings: string[] = [];
  const tables = files.map((f) => parseAcsTaskTable(f.content, f.name));

  const byProcessor = new Map<string, AcsParsedTaskTable>();
  for (const tt of tables) {
    const existing = byProcessor.get(tt.processorName);
    if (existing)
      throw new TtParseError(
        `Processor ${tt.processorName} appears in both ${existing.sourceName} and ${tt.sourceName}`,
      );
    byProcessor.set(tt.processorName, tt);
  }

  const detectedSourceRoot =
    tables
      .flatMap((tt) => tt.tasks.map((t) => sourceRootOf(t.fileNameRaw)))
      .find((r) => r !== null) ?? null;
  const installRoot = options.installRoot ?? null;

  const producers = new Map<string, string>();
  for (const tt of tables)
    for (const type of dbOutputTypesOf(tt)) {
      // SIRPRODRPT-style report types are emitted by every table; they never
      // define a dependency.
      const emittedByAll = tables.every((other) =>
        dbOutputTypesOf(other).includes(type),
      );
      if (!emittedByAll || tables.length === 1)
        producers.set(type, tt.processorName);
    }

  const nodes: AcsChainNodePlan[] = tables.map((tt) => {
    const configDir = rerootPath(tt.configFileRaw, installRoot).replace(
      /\/[^/]*$/,
      '',
    );
    const configSpaceFiles = Object.fromEntries(
      tt.configSpaces.map((space) => [
        space,
        `${configDir}/Alternate_${space}_${tt.configFileVersion || '3.0'}.xml`,
      ]),
    );

    const taskTable: TaskTableConfig = {
      processorName: tt.processorName,
      version: tt.version,
      configFile: rerootPath(tt.configFileRaw, installRoot),
      configSpaces: tt.configSpaces,
      configSpaceFiles,
      productNamePrefix: PRODUCT_NAME_PREFIX,
      tasks: tt.tasks.map(
        (t): TaskTableTask => ({
          name: t.name,
          version: t.version,
          inputs: t.inputs,
          outputs: t.outputs,
        }),
      ),
    };
    // Extra scheduling metadata mirrored from the table (informational).
    Object.assign(taskTable, {
      minDiskSpaceMB: tt.minDiskSpaceMB,
      maxTimeSec: tt.maxTimeSec,
    });

    const dbOutputs = dbOutputTypesOf(tt);
    const dbInputs = dbInputTypesOf(tt);
    return {
      acronym: tt.processorName,
      sourceName: tt.sourceName,
      version: tt.version,
      taskTable,
      executables: tt.tasks.map((t, i) => ({
        scriptType: scriptTypeOf(t.fileNameRaw),
        stage: 'Exe' as const,
        path: rerootPath(t.fileNameRaw, installRoot),
        name: kebab(t.name),
        sequence: i,
      })),
      outputs: dbOutputs.map((type) => ({
        role: 'output',
        localName: `out/CS_*${type}*`,
        contentType: 'application/octet-stream',
        productTypeAcronym: type,
      })),
      requiredDiskBytes: String(BigInt(tt.minDiskSpaceMB) * 1024n * 1024n),
      dbInputTypes: dbInputs,
      dbOutputTypes: dbOutputs,
      externalInputTypes: dbInputs.filter((t) => !producers.has(t)),
      suggestedImageUrl: suggestImage(tt.tasks.map((t) => t.fileNameRaw)),
    };
  });

  const edges: AcsChainEdgePlan[] = [];
  for (const parent of tables) {
    for (const child of tables) {
      if (parent === child) continue;
      const viaTypes = dbOutputTypesOf(parent).filter(
        (type) =>
          producers.get(type) === parent.processorName &&
          dbInputTypesOf(child).includes(type),
      );
      if (viaTypes.length === 0) continue;
      edges.push({
        parentAcronym: parent.processorName,
        childAcronym: child.processorName,
        dependencyMode: edgeMode(child, viaTypes),
        viaTypes,
      });
    }
  }

  // Chain name: the sink processor of the graph (e.g. P2P_GOP), or the lone
  // table's processor.
  const hasOutgoing = new Set(edges.map((e) => e.parentAcronym));
  const sinks = nodes.filter((n) => !hasOutgoing.has(n.acronym));
  const name =
    nodes.length === 1
      ? nodes[0].acronym
      : sinks.length === 1
        ? `${sinks[0].acronym} chain`
        : `${nodes[0].acronym} chain`;

  if (installRoot && !detectedSourceRoot)
    warnings.push(
      'installRoot was provided but no /Binaries/ segment was found in any executable path — paths were left unchanged.',
    );

  return { name, nodes, edges, detectedSourceRoot, warnings };
}
