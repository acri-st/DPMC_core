/**
 * ACS-style IPF Job Order generation for CryoSat Ocean Baseline-D processors.
 *
 * The seeded ProcessingChain nodes carry their IPF Task Table transcription in
 * `configuration.taskTable` (see packages/prisma production-chain constants).
 * At dispatch time the API renders one `Ipf_Job_Order` XML per job from that
 * transcription plus the batch's resolved input Products; the worker stages it
 * into the run dir and every task-table executable receives its path as the
 * single positional argument.
 *
 * Element names match what the delivered binaries parse (extracted from their
 * strings): `Ipf_Conf.{Processor_Name,Version,Order_Type,Logging_Level,Test,
 * Processing_Station,Config_Files.<config-space>,Sensing_Time.{Start,Stop}}`
 * and `List_of_Ipf_Procs.Ipf_Proc[].{Task_Name,Task_Version,List_of_Inputs,
 * List_of_Outputs}`. Times use the ACS `YYYYMMDD_HHMMSSuuuuuu` form with the
 * binaries' own open-interval sentinels as fallbacks.
 */

export interface TaskTableAlternative {
  order: number;
  fileType?: string;
  retrievalMode?: string;
  t0?: number;
  t1?: number;
}

export interface TaskTableInput {
  fileType?: string;
  origin: string;
  retrievalMode?: string;
  t0?: number;
  t1?: number;
  mandatory?: boolean;
  alternatives?: TaskTableAlternative[];
}

export interface TaskTableOutput {
  fileType: string;
  destination: string;
}

export interface TaskTableTask {
  name: string;
  version: string;
  inputs?: TaskTableInput[];
  outputs?: TaskTableOutput[];
}

export interface TaskTableConfig {
  processorName: string;
  version: string;
  /** Private_Config Cfg_File — rendered as Ipf_Conf.Processor_Conf.File_Name. */
  configFile?: string;
  configSpaces?: string[];
  /** Config-space name → file rendered as Ipf_Conf.Config_Files.<space>. */
  configSpaceFiles?: Record<string, string>;
  /** Rendered as Ipf_Conf.Dynamic_Processing_Parameters (e.g. Baseline: D). */
  dynamicProcessingParameters?: Record<string, string>;
  /** Mission prefix for EE product-name stems (`<prefix>_<type>_<sensing>`).
   * Defaults to the CryoSat convention when absent. */
  productNamePrefix?: string;
  tasks?: TaskTableTask[];
}

/** One staged input file available to the job, keyed by product type. */
export interface ResolvedInputFile {
  /** Absolute path inside the container (e.g. /work/input/CS_OPER_…). */
  path: string;
  start?: Date | null;
  stop?: Date | null;
  /** Pre-rendered IPF validity bounds (open-interval sentinels preserved —
   * `99999999T999999` in a product name must reach the job order verbatim,
   * a Date roundtrip would mangle it into a garbage year). */
  startIpf?: string;
  stopIpf?: string;
}

const OPEN_INTERVAL_START = '00000000_000000000000';
const OPEN_INTERVAL_STOP = '99999999_999999999999';
const LOG_LOCAL_NAME = 'LOG';

/** Format a date as the ACS job-order `YYYYMMDD_HHMMSSuuuuuu` timestamp. */
export function formatIpfTime(date: Date): string {
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return (
    p(date.getUTCFullYear(), 4) +
    p(date.getUTCMonth() + 1, 2) +
    p(date.getUTCDate(), 2) +
    '_' +
    p(date.getUTCHours(), 2) +
    p(date.getUTCMinutes(), 2) +
    p(date.getUTCSeconds(), 2) +
    p(date.getUTCMilliseconds() * 1000, 6)
  );
}

/**
 * Parse the validity interval embedded in an ESA Earth-Explorer product name,
 * e.g. `CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001`. Open
 * bounds (`00000000T000000` / `99999999T999999`) yield null Dates but keep
 * their IPF sentinel rendering.
 */
export function parseSensingFromName(name: string): {
  start: Date | null;
  stop: Date | null;
  startIpf: string;
  stopIpf: string;
} | null {
  const m = /_(\d{8})T(\d{6})_(\d{8})T(\d{6})/.exec(name);
  if (!m) return null;
  const toDate = (d: string, t: string): Date | null => {
    if (d === '00000000' || d === '99999999') return null;
    const date = new Date(
      Date.UTC(
        Number(d.slice(0, 4)),
        Number(d.slice(4, 6)) - 1,
        Number(d.slice(6, 8)),
        Number(t.slice(0, 2)),
        Number(t.slice(2, 4)),
        Number(t.slice(4, 6)),
      ),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const start = toDate(m[1], m[2]);
  const stop = toDate(m[3], m[4]);
  return {
    start,
    stop,
    startIpf: start ? formatIpfTime(start) : OPEN_INTERVAL_START,
    stopIpf: stop ? formatIpfTime(stop) : OPEN_INTERVAL_STOP,
  };
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

interface RenderedInput {
  fileType: string;
  fileNameType: string;
  files: ResolvedInputFile[];
}

/** Compact `YYYYMMDDTHHMMSS` timestamp used inside EE product names. */
function formatEeTime(date: Date | null, fallback: string): string {
  if (!date) return fallback;
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return (
    p(date.getUTCFullYear(), 4) +
    p(date.getUTCMonth() + 1, 2) +
    p(date.getUTCDate(), 2) +
    'T' +
    p(date.getUTCHours(), 2) +
    p(date.getUTCMinutes(), 2) +
    p(date.getUTCSeconds(), 2)
  );
}

/**
 * Pick the concrete file type + files for a task-table input:
 * - `PROC` intermediates resolve to the run's stem for that type (the
 *   reference job orders name intermediates as full EE product names,
 *   `CS_OPER_<type>_<start>_<stop>_0001` — see stemFor).
 * - `LOG` resolves to the chain's shared `<workdir>/LOG` capture file.
 * - `DB` inputs resolve to staged Products; with ordered alternatives, the
 *   first alternative with at least one staged file wins.
 */
function resolveInput(
  input: TaskTableInput,
  filesByType: ReadonlyMap<string, ResolvedInputFile[]>,
  workdir: string,
  stemFor: (fileType: string) => string,
): RenderedInput | null {
  const candidates: string[] = input.fileType
    ? [input.fileType]
    : (input.alternatives ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .flatMap((a) => (a.fileType ? [a.fileType] : []));
  if (candidates.length === 0) return null;

  if (input.origin === 'PROC') {
    return {
      fileType: candidates[0],
      fileNameType: 'Stem',
      files: [{ path: stemFor(candidates[0]) }],
    };
  }
  if (input.origin === 'LOG') {
    return {
      fileType: candidates[0],
      fileNameType: 'Physical',
      files: [{ path: `${workdir}/${LOG_LOCAL_NAME}` }],
    };
  }

  const matched = candidates.find((c) => (filesByType.get(c) ?? []).length > 0);
  // Chronological order: multi-file inputs (P2P's L2 segments, 6h-step aux)
  // must be listed by ascending sensing start — the ACS L2Input reader
  // rejects a list that goes backwards in time. Undated files keep their
  // relative order at the end.
  const files = matched
    ? [...filesByType.get(matched)!].sort(
        (a, b) =>
          (a.start?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.start?.getTime() ?? Number.POSITIVE_INFINITY),
      )
    : [];
  return {
    fileType: matched ?? candidates[0],
    fileNameType: 'Physical',
    files,
  };
}

export interface JobOrderResult {
  xml: string;
  /** Mandatory DB inputs with no staged Product — the job may fail on these. */
  missingMandatory: string[];
}

export function buildJobOrder(args: {
  taskTable: TaskTableConfig;
  /** Staged DB input files grouped by product type acronym. */
  filesByType: ReadonlyMap<string, ResolvedInputFile[]>;
  processingStation: string;
  /** Container-side run directory (the worker's /work mount). */
  workdir: string;
  orderType?: string;
  loggingLevel?: string;
}): JobOrderResult {
  const { taskTable, filesByType, workdir } = args;
  const missingMandatory: string[] = [];

  // Sensing window = the PRIMARY product's interval — the first task's first
  // DB input (the reference job orders stamp the driving L0's exact times,
  // not the envelope of the aux files, whose validities span decades).
  let sensingStart: Date | null = null;
  let sensingStop: Date | null = null;
  const primary = (taskTable.tasks ?? [])
    .flatMap((t) => t.inputs ?? [])
    .find((i) => i.origin === 'DB');
  const primaryFiles = primary?.fileType
    ? (filesByType.get(primary.fileType) ?? [])
    : [];
  for (const f of primaryFiles) {
    if (f.start && (!sensingStart || f.start < sensingStart))
      sensingStart = f.start;
    if (f.stop && (!sensingStop || f.stop > sensingStop)) sensingStop = f.stop;
  }
  if (!sensingStart && !sensingStop) {
    // No primary product staged — fall back to the envelope of everything.
    for (const files of filesByType.values()) {
      for (const f of files) {
        if (f.start && (!sensingStart || f.start < sensingStart))
          sensingStart = f.start;
        if (f.stop && (!sensingStop || f.stop > sensingStop))
          sensingStop = f.stop;
      }
    }
  }

  // Product-name stems, matching the reference job orders from the
  // operational system: intermediates and outputs are named as full EE
  // product names `CS_OPER_<type>_<start>_<stop>_0001` derived from the
  // sensing envelope — the processors keep that naming for what they write.
  const eeStart = formatEeTime(sensingStart, '00000000T000000');
  const eeStop = formatEeTime(sensingStop, '99999999T999999');
  const namePrefix = taskTable.productNamePrefix ?? 'CS_OPER';
  const stemFor = (fileType: string, dir = workdir) =>
    `${dir}/${namePrefix}_${fileType}_${eeStart}_${eeStop}_0001`;

  const lines: string[] = [];
  const push = (indent: number, text: string) =>
    lines.push('  '.repeat(indent) + text);

  push(0, '<?xml version="1.0" encoding="UTF-8"?>');
  push(
    0,
    '<Ipf_Job_Order xmlns:a="http://www.acsys.it/schemas/IPF" xmlns:xsi="http://www.w3.org/2000/10/XMLSchema-instance" xsi:schemaLocation="http://www.acsys.it/schemas/IPF JobOrder.xsd">',
  );
  push(1, '<Ipf_Conf>');
  push(2, `<Processor_Name>${esc(taskTable.processorName)}</Processor_Name>`);
  push(2, `<Version>${esc(taskTable.version)}</Version>`);
  push(2, `<Order_Type>${esc(args.orderType ?? 'OFFL')}</Order_Type>`);
  push(2, `<Logging_Level>${esc(args.loggingLevel ?? 'INFO')}</Logging_Level>`);
  push(2, '<Test>false</Test>');
  push(2, '<Breakpoint_Enable>false</Breakpoint_Enable>');
  push(
    2,
    `<Processing_Station>${esc(args.processingStation)}</Processing_Station>`,
  );
  push(2, '<Config_Files>');
  for (const space of taskTable.configSpaces ?? []) {
    push(
      3,
      `<${space}>${esc(taskTable.configSpaceFiles?.[space] ?? '')}</${space}>`,
    );
  }
  push(2, '</Config_Files>');
  push(2, '<Sensing_Time>');
  push(
    3,
    `<Start>${sensingStart ? formatIpfTime(sensingStart) : OPEN_INTERVAL_START}</Start>`,
  );
  push(
    3,
    `<Stop>${sensingStop ? formatIpfTime(sensingStop) : OPEN_INTERVAL_STOP}</Stop>`,
  );
  push(2, '</Sensing_Time>');
  const dynParams = Object.entries(taskTable.dynamicProcessingParameters ?? {});
  if (dynParams.length > 0) {
    push(2, '<Dynamic_Processing_Parameters>');
    for (const [name, value] of dynParams) {
      push(3, '<Processing_Parameter>');
      push(4, `<Name>${esc(name)}</Name>`);
      push(4, `<Value>${esc(value)}</Value>`);
      push(3, '</Processing_Parameter>');
    }
    push(2, '</Dynamic_Processing_Parameters>');
  }
  push(1, '</Ipf_Conf>');
  // The ACS parser reads Processor_Conf.File_Name (the task table's
  // Private_Config Cfg_File) at the DOCUMENT root — a sibling of Ipf_Conf,
  // not a child (verified against the delivered binaries, which fail with
  // "Bad tag format in reading resource Processor_Conf.File_Name" when it
  // is nested inside Ipf_Conf).
  push(1, '<Processor_Conf>');
  push(2, `<File_Name>${esc(taskTable.configFile ?? '')}</File_Name>`);
  push(1, '</Processor_Conf>');

  const tasks = taskTable.tasks ?? [];
  push(1, `<List_of_Ipf_Procs count="${tasks.length}">`);
  for (const task of tasks) {
    push(2, '<Ipf_Proc>');
    push(3, `<Task_Name>${esc(task.name)}</Task_Name>`);
    push(3, `<Task_Version>${esc(task.version)}</Task_Version>`);
    push(3, '<Breakpoint>');
    push(4, '<Enable>OFF</Enable>');
    push(4, '<List_of_Brk_Files count="0"> </List_of_Brk_Files>');
    push(3, '</Breakpoint>');

    const rendered = (task.inputs ?? [])
      .map((input) => {
        const r = resolveInput(input, filesByType, workdir, stemFor);
        if (
          r &&
          input.origin === 'DB' &&
          r.files.length === 0 &&
          input.mandatory
        )
          missingMandatory.push(`${task.name}:${r.fileType}`);
        return r;
      })
      // The embedded ACS job-order reader aborts on ANY input whose
      // List_of_File_Names is empty (joborder.C "count in the joborder list
      // is zero"), even for mandatory:false types — omit fileless inputs
      // entirely. Missing mandatory types then fail in the processor's own
      // per-PCONF count check, with a far clearer message.
      .filter((r): r is RenderedInput => r !== null && r.files.length > 0);

    push(3, `<List_of_Inputs count="${rendered.length}">`);
    for (const input of rendered) {
      push(4, '<Input>');
      push(5, `<File_Type>${esc(input.fileType)}</File_Type>`);
      push(5, `<File_Name_Type>${input.fileNameType}</File_Name_Type>`);
      push(5, `<List_of_File_Names count="${input.files.length}">`);
      for (const f of input.files)
        push(6, `<File_Name>${esc(f.path)}</File_Name>`);
      push(5, '</List_of_File_Names>');
      push(5, `<List_of_Time_Intervals count="${input.files.length}">`);
      for (const f of input.files) {
        // Validity bounds come verbatim from the product name — including
        // the open-interval sentinels, which the reference job orders pass
        // through as-is. Files with no embedded validity (PROC stems, LOG)
        // carry the job's sensing window.
        const start =
          f.startIpf ??
          (f.start
            ? formatIpfTime(f.start)
            : sensingStart
              ? formatIpfTime(sensingStart)
              : OPEN_INTERVAL_START);
        const stop =
          f.stopIpf ??
          (f.stop
            ? formatIpfTime(f.stop)
            : sensingStop
              ? formatIpfTime(sensingStop)
              : OPEN_INTERVAL_STOP);
        push(6, '<Time_Interval>');
        push(7, `<Start>${start}</Start>`);
        push(7, `<Stop>${stop}</Stop>`);
        push(7, `<File_Name>${esc(f.path)}</File_Name>`);
        push(6, '</Time_Interval>');
      }
      push(5, '</List_of_Time_Intervals>');
      push(4, '</Input>');
    }
    push(3, '</List_of_Inputs>');

    const outputs = task.outputs ?? [];
    push(3, `<List_of_Outputs count="${outputs.length}">`);
    for (const output of outputs) {
      // PROC intermediates are EE-name stems at the workdir root, consumed
      // by later tasks of the same job order. DB (final) outputs take the
      // out/ DIRECTORY: the processors generate their own product names
      // inside it (verified empirically — a stem there is treated as a
      // directory and fails with "I/O error"), and the dispatch's stage-out
      // globs collect whatever lands in out/.
      const isProc = output.destination === 'PROC';
      push(4, '<Output>');
      push(5, `<File_Type>${esc(output.fileType)}</File_Type>`);
      push(
        5,
        `<File_Name_Type>${isProc ? 'Stem' : 'Physical'}</File_Name_Type>`,
      );
      push(
        5,
        `<File_Name>${esc(isProc ? stemFor(output.fileType) : `${workdir}/out`)}</File_Name>`,
      );
      push(4, '</Output>');
    }
    push(3, '</List_of_Outputs>');
    push(2, '</Ipf_Proc>');
  }
  push(1, '</List_of_Ipf_Procs>');
  push(0, '</Ipf_Job_Order>');

  return { xml: lines.join('\n') + '\n', missingMandatory };
}
