import {
  ProcessingChainNodeSchema,
  ProductionChainEdgeSchema,
  ProductionChainGraphSchema,
  ProductionChainSchema,
  type DependencyMode,
  type ProductionChain as ApiProductionChain,
  type ProductionChainEdge as ApiProductionChainEdge,
  type ProcessingChainNode as ApiProcessingChainNode,
  type ProductionChainVersion as ApiProductionChainVersion,
} from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';
import type {
  ProcessingScriptNode,
  ProductionChainGraph,
  ProductionChainGraphEdge,
  ProductionChainSummary,
  ProductionChainVersionInfo,
} from '@/features/production-chain/types';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductionChainSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductionChainGraphSchema,
});

const ODataVersionSchema = z.object({
  id: z.number(),
  productionChainId: z.number(),
  version: z.string(),
  isLatest: z.boolean(),
  configuration: z.unknown().nullable().optional(),
  processingChains: ProcessingChainNodeSchema.array().optional().default([]),
  edges: ProductionChainEdgeSchema.array().optional().default([]),
});

const ODataVersionListSchema = z.object({
  '@odata.context': z.string().optional(),
  '@odata.count': z.number().optional(),
  value: ODataVersionSchema.array(),
});

type ODataVersion = z.infer<typeof ODataVersionSchema>;

/**
 * OData representation of a ProcessingScript with its default version
 * expanded — gives us enough detail (acronym, requiredCpu/Ram/Disk, runtime,
 * image, GPU…) to populate the DAG node cards.
 */
const ODataScriptWithVersionSchema = z.object({
  id: z.number(),
  name: z.string(),
  acronym: z.string(),
  defaultVersionId: z.number().nullable(),
  defaultVersion: z
    .object({
      id: z.number(),
      version: z.string(),
      runtime: z.enum(['Docker', 'Apptainer', 'None']),
      imageUrl: z.string().nullable(),
      imageTag: z.string().nullable(),
      requiredCpu: z.number(),
      requiredRam: z.union([z.number(), z.string(), z.bigint()]),
      requiredDisk: z.union([z.number(), z.string(), z.bigint()]),
      requiresGpu: z.boolean(),
      gpuCount: z.number().int(),
    })
    .nullable()
    .optional(),
});

const ODataScriptListSchema = z.object({
  '@odata.context': z.string().optional(),
  value: ODataScriptWithVersionSchema.array(),
});

type ODataScriptWithVersion = z.infer<typeof ODataScriptWithVersionSchema>;

const ODataExecutableSchema = z.object({
  id: z.number(),
  scriptType: z.enum([
    'Bash',
    'Python',
    'Node',
    'Binary',
    'PgBash',
    'PlSql',
    'Sql',
  ]),
  stage: z.enum(['Pre', 'Exe', 'Post']),
  path: z.string(),
  name: z.string(),
  sequence: z.number().int(),
  args: z.string().nullable(),
});

const ODataVersionWithExecutablesSchema = z.object({
  id: z.number(),
  processingScriptId: z.number(),
  version: z.string(),
  isLatest: z.boolean(),
  executables: z.array(ODataExecutableSchema).optional().default([]),
});

const ODataVersionWithExecutablesListSchema = z.object({
  '@odata.context': z.string().optional(),
  value: ODataVersionWithExecutablesSchema.array(),
});

type ODataVersionWithExecutables = z.infer<
  typeof ODataVersionWithExecutablesSchema
>;

export type ListProductionChainsParams = {
  page: number;
  pageSize: number;
  q?: string;
  kind?: 'Standard' | 'Watcher';
  isActive?: boolean;
};
export type ListProductionChainsResult = {
  items: ProductionChainSummary[];
  total: number;
};

export async function listProductionChains(
  params: ListProductionChainsParams,
): Promise<ListProductionChainsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.kind) search.set('kind', params.kind);
  if (params.isActive !== undefined)
    search.set('isActive', String(params.isActive));
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/production-chain?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data.map(toSummary),
    total: Number.isFinite(total) ? total : 0,
  };
}

/**
 * Load the production chain detail.
 *
 * The main `GET /production-chain/:id` endpoint returns the latest version
 * with its full graph (processingChains + edges). To populate the selector
 * and render older versions, we additionally call OData with expanded version
 * relations.
 */
const CreateResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductionChainSchema,
});

export async function createProductionChain(input: {
  name: string;
  comment?: string | null;
}): Promise<{ id: number }> {
  const raw = await apiFetch<unknown>('/production-chain', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      comment: input.comment ?? null,
    }),
  });
  const parsed = CreateResponseSchema.parse(raw);
  return { id: parsed.data.id };
}

const ImportResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: z.object({
    chainId: z.number(),
    versionId: z.number(),
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
  }),
});

export async function importProductionChainFromTaskTable(input: {
  adapter: 'ipf';
  content: string;
}): Promise<{
  chainId: number;
  nodeCount: number;
  edgeCount: number;
}> {
  const raw = await apiFetch<unknown>('/production-chain/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const parsed = ImportResponseSchema.parse(raw);
  return {
    chainId: parsed.data.chainId,
    nodeCount: parsed.data.nodeCount,
    edgeCount: parsed.data.edgeCount,
  };
}

export type ChainImportPreview = {
  name: string;
  comment?: string;
  nodes: Array<{
    acronym: string;
    name: string;
    path: string;
    inputTypes: string[];
    outputTypes: string[];
  }>;
  edges: Array<{
    parentAcronym: string;
    childAcronym: string;
    matchType: string;
  }>;
  parameters: Array<{
    key: string;
    label: string;
    type: 'string' | 'number';
    default?: string | number;
  }>;
};

const PreviewResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: z.object({
    name: z.string(),
    comment: z.string().optional(),
    nodes: z.array(
      z.object({
        acronym: z.string(),
        name: z.string(),
        path: z.string(),
        inputTypes: z.array(z.string()),
        outputTypes: z.array(z.string()),
      }),
    ),
    edges: z.array(
      z.object({
        parentAcronym: z.string(),
        childAcronym: z.string(),
        matchType: z.string(),
      }),
    ),
    parameters: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(['string', 'number']),
        default: z.union([z.string(), z.number()]).optional(),
      }),
    ),
  }),
});

export async function previewProductionChainFromTaskTable(input: {
  adapter: 'ipf';
  content: string;
}): Promise<ChainImportPreview> {
  const raw = await apiFetch<unknown>('/production-chain/import/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const parsed = PreviewResponseSchema.parse(raw);
  return parsed.data;
}

// ---- Old-ACS (CryoSat-style, root <Task_Table>) multi-file import ----------

export type AcsTaskTableFile = { name: string; content: string };

export type AcsImportOptions = {
  installRoot?: string;
  chainName?: string;
  images?: Record<string, { imageUrl: string; imageTag?: string }>;
};

/** True for old-ACS task tables (CryoSat deliveries) as opposed to the
 * Sentinel-style `<Ipf_Task_Table>` handled by the `ipf` adapter. */
export function isAcsTaskTableContent(content: string): boolean {
  return (
    /<Task_Table[\s>]/.test(content) && !/<Ipf_Task_Table[\s>]/.test(content)
  );
}

const AcsPreviewResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: z.object({
    name: z.string(),
    nodes: z.array(
      z.object({
        acronym: z.string(),
        sourceName: z.string(),
        version: z.string(),
        taskCount: z.number(),
        executables: z.array(
          z.object({
            name: z.string(),
            path: z.string(),
            sequence: z.number(),
          }),
        ),
        dbOutputTypes: z.array(z.string()),
        externalInputTypes: z.array(z.string()),
        suggestedImageUrl: z.string().nullable(),
      }),
    ),
    edges: z.array(
      z.object({
        parentAcronym: z.string(),
        childAcronym: z.string(),
        dependencyMode: z.enum(['OnSuccess', 'OnCompletion']),
        viaTypes: z.array(z.string()),
      }),
    ),
    detectedSourceRoot: z.string().nullable(),
    warnings: z.array(z.string()),
  }),
});

export type AcsChainImportPreview = z.infer<
  typeof AcsPreviewResponseSchema
>['data'];

export async function previewAcsProductionChain(input: {
  files: AcsTaskTableFile[];
  options?: AcsImportOptions;
}): Promise<AcsChainImportPreview> {
  const raw = await apiFetch<unknown>('/production-chain/import/acs/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return AcsPreviewResponseSchema.parse(raw).data;
}

const AcsImportResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: z.object({
    chainId: z.number(),
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
  }),
});

export async function importAcsProductionChain(input: {
  files: AcsTaskTableFile[];
  options?: AcsImportOptions;
}): Promise<{ chainId: number; nodeCount: number; edgeCount: number }> {
  const raw = await apiFetch<unknown>('/production-chain/import/acs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return AcsImportResponseSchema.parse(raw).data;
}

export async function getProductionChainGraph(
  id: string,
  _versionId?: string | null,
): Promise<ProductionChainGraph> {
  const raw = await apiFetch<unknown>(`/production-chain/${id}`);
  const parsed = GetResponseSchema.parse(raw);
  const chain = parsed.data;

  // The version layer was dropped: the API now returns processingChains + edges
  // directly on the chain. Build a synthetic version from those fields.
  const syntheticVersion: ApiProductionChainVersion = {
    id: chain.id,
    version: 'current',
    isLatest: true,
    configuration: (chain as { configuration?: unknown }).configuration ?? null,
    processingChains:
      (chain as { processingChains?: ApiProcessingChainNode[] })
        .processingChains ?? [],
    edges: (chain as { edges?: ApiProductionChainEdge[] }).edges ?? [],
  };

  const [scriptIndex, executablesByScriptId] = await Promise.all([
    listScriptsWithDefaultVersion().catch(
      () => new Map<number, ODataScriptWithVersion>(),
    ),
    listLatestExecutablesByScriptId().catch(
      () => new Map<number, ODataVersionWithExecutables>(),
    ),
  ]);

  return toGraph(
    chain,
    syntheticVersion,
    [syntheticVersion],
    scriptIndex,
    executablesByScriptId,
  );
}

export async function listProductionChainVersions(
  chainId: string,
): Promise<ODataVersion[]> {
  const params = new URLSearchParams({
    $expand: 'processingChains,edges',
    $filter: `productionChainId eq '${chainId}'`,
    $orderby: 'version asc',
  });
  const raw = await apiFetch<unknown>(
    `/odata/production-chain-version?${params}`,
  );
  const parsed = ODataVersionListSchema.safeParse(raw);
  return parsed.success ? parsed.data.value : [];
}

async function listScriptsWithDefaultVersion(): Promise<
  Map<number, ODataScriptWithVersion>
> {
  const raw = await apiFetch<unknown>(
    '/odata/processing-script?$expand=defaultVersion',
  );
  const parsed = ODataScriptListSchema.safeParse(raw);
  const map = new Map<number, ODataScriptWithVersion>();
  if (parsed.success) {
    for (const s of parsed.data.value) {
      map.set(s.id, s);
    }
  }
  return map;
}

async function listLatestExecutablesByScriptId(): Promise<
  Map<number, ODataVersionWithExecutables>
> {
  const raw = await apiFetch<unknown>(
    '/odata/processing-script-version?$expand=executables&$filter=isLatest eq true',
  );
  const parsed = ODataVersionWithExecutablesListSchema.safeParse(raw);
  const map = new Map<number, ODataVersionWithExecutables>();
  if (parsed.success) {
    for (const v of parsed.data.value) {
      map.set(v.processingScriptId, v);
    }
  }
  return map;
}

function toSummary(chain: ApiProductionChain): ProductionChainSummary {
  return {
    id: chain.id,
    name: chain.name,
    comment: chain.comment,
    isActive: chain.isActive,
    kind: chain.kind,
    createdAt: chain.createdAt.toISOString(),
    updatedAt: chain.updatedAt.toISOString(),
  };
}

function toGraph(
  chain: ApiProductionChain,
  selected: ApiProductionChainVersion | null,
  versions: ApiProductionChainVersion[],
  scriptIndex: Map<number, ODataScriptWithVersion>,
  executablesByScriptId: Map<number, ODataVersionWithExecutables>,
): ProductionChainGraph {
  const summary = toSummary(chain);
  const scripts = selected
    ? selected.processingChains.map((node) =>
        toScriptNode(
          node,
          scriptIndex.get(node.processingScriptId),
          executablesByScriptId.get(node.processingScriptId)?.executables ?? [],
        ),
      )
    : [];
  const edges = selected ? selected.edges.map(toEdge) : [];
  return {
    ...summary,
    configuration:
      selected &&
      selected.configuration &&
      typeof selected.configuration === 'object'
        ? (selected.configuration as Record<string, unknown>)
        : null,
    scripts: deriveIoFromGraph(scripts, edges),
    edges,
    versions: versions.map(toVersionInfo),
    selectedVersion: selected ? toVersionInfo(selected) : null,
  };
}

/**
 * Fill in inputs/outputs on nodes that don't declare them explicitly
 * (configuration.inputTypes/outputTypes). Mirrors the dispatcher's
 * task.service.ts:deriveOutputRole + parent-walk so the UI surfaces the
 * same role names the worker will see at run time.
 *
 * Output role: `--color XYZ` → role `XYZ`; otherwise `output`.
 * Input role: 0 or 1 parent → `input`; N parents → each parent's outputRole.
 */
function deriveIoFromGraph(
  scripts: ProcessingScriptNode[],
  edges: ProductionChainGraphEdge[],
): ProcessingScriptNode[] {
  if (scripts.length === 0) return scripts;
  const byId = new Map(scripts.map((s) => [s.id, s]));
  const parentsByChild = new Map<string, string[]>();
  const fanOutTargets = new Set<string>();
  for (const e of edges) {
    const list = parentsByChild.get(e.target) ?? [];
    list.push(e.source);
    parentsByChild.set(e.target, list);
    if (e.isFanOut) fanOutTargets.add(e.target);
  }
  const derivedOutputRole = new Map<string, string>();
  for (const s of scripts) {
    const args = s.executables[0]?.args ?? null;
    derivedOutputRole.set(s.id, parseColorRole(args) ?? 'output');
  }
  return scripts.map((s) => {
    const inputs =
      s.inputs.length > 0
        ? s.inputs
        : deriveInputs(s.id, parentsByChild, derivedOutputRole, byId);
    const outputs =
      s.outputs.length > 0
        ? s.outputs
        : [{ keyword: derivedOutputRole.get(s.id) ?? 'output' }];
    return { ...s, inputs, outputs, isFanOutTarget: fanOutTargets.has(s.id) };
  });
}

function deriveInputs(
  nodeId: string,
  parentsByChild: Map<string, string[]>,
  derivedOutputRole: Map<string, string>,
  byId: Map<string, ProcessingScriptNode>,
): { keyword: string }[] {
  const parents = parentsByChild.get(nodeId) ?? [];
  if (parents.length <= 1) return [{ keyword: 'input' }];
  // Fan-in: each parent contributes its own output role (e.g. red, blue, …).
  return parents
    .map((pid) => byId.get(pid) && derivedOutputRole.get(pid))
    .filter((s): s is string => Boolean(s))
    .map((keyword) => ({ keyword }));
}

function parseColorRole(args: string | null | undefined): string | null {
  if (!args) return null;
  const m = args.match(/--color\s+(\S+)/);
  return m ? m[1] : null;
}

function toVersionInfo(
  v: ApiProductionChainVersion,
): ProductionChainVersionInfo {
  return {
    id: String(v.id),
    version: v.version,
    isLatest: v.isLatest,
    configuration:
      v.configuration && typeof v.configuration === 'object'
        ? (v.configuration as Record<string, unknown>)
        : null,
  };
}

function toScriptNode(
  node: ApiProcessingChainNode,
  script: ODataScriptWithVersion | undefined,
  executables: z.infer<typeof ODataExecutableSchema>[],
): ProcessingScriptNode {
  const v = script?.defaultVersion ?? null;
  const isInDocker = v?.runtime === 'Docker' || v?.runtime === 'Apptainer';
  const dockerImage = v
    ? [v.imageUrl, v.imageTag].filter(Boolean).join(':') || null
    : null;
  const sortedExecs = [...executables].sort(stageThenSequence);
  const exeStage = sortedExecs.find((e) => e.stage === 'Exe');
  const primaryType =
    exeStage?.scriptType ?? sortedExecs[0]?.scriptType ?? 'Binary';
  return {
    id: String(node.id),
    acronym: script?.acronym ?? node.name,
    name: script?.name ?? node.name,
    version: v?.version ?? '—',
    scriptType: primaryType,
    isInDocker,
    dockerImage,
    requiredCpu: v?.requiredCpu ?? 0,
    requiredRam: toNumberSafe(v?.requiredRam),
    requiredDisk: toNumberSafe(v?.requiredDisk),
    inputs: extractKeywordList(node.configuration, 'inputTypes'),
    outputs: extractKeywordList(node.configuration, 'outputTypes'),
    executables: sortedExecs.map((e) => ({
      id: String(e.id),
      scriptType: e.scriptType,
      stage: e.stage,
      name: e.name,
      path: e.path,
      sequence: e.sequence,
      args: e.args,
    })),
    isFanOutTarget: false,
  };
}

const STAGE_ORDER: Record<'Pre' | 'Exe' | 'Post', number> = {
  Pre: 0,
  Exe: 1,
  Post: 2,
};
function stageThenSequence(
  a: { stage: 'Pre' | 'Exe' | 'Post'; sequence: number },
  b: { stage: 'Pre' | 'Exe' | 'Post'; sequence: number },
): number {
  const s = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
  return s !== 0 ? s : a.sequence - b.sequence;
}

function toNumberSafe(input: number | string | bigint | undefined): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') return input;
  if (typeof input === 'bigint') return Number(input);
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

function extractKeywordList(
  configuration: unknown,
  key: 'inputTypes' | 'outputTypes',
): { keyword: string }[] {
  if (!configuration || typeof configuration !== 'object') return [];
  const raw = (configuration as Record<string, unknown>)[key];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((keyword) => ({ keyword }));
}

function toEdge(edge: ApiProductionChainEdge): ProductionChainGraphEdge {
  return {
    id: String(edge.id),
    source: String(edge.parentChainId),
    target: String(edge.childChainId),
    dependencyMode: edge.dependencyMode as DependencyMode,
    isFanOut: edge.isFanOut ?? false,
  };
}

// ---- DAG editor mutations -------------------------------------------------

const AddProcessingChainResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProcessingChainNodeSchema,
});

const AddEdgeResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductionChainEdgeSchema,
});

export async function addProcessingChain(
  chainId: string,
  input: {
    processingScriptId: number;
    name: string;
    comment?: string | null;
    configuration?: unknown;
  },
): Promise<{ id: number }> {
  const raw = await apiFetch<unknown>(
    `/production-chain/${chainId}/processing-chains`,
    {
      method: 'POST',
      body: JSON.stringify({
        processingScriptId: input.processingScriptId,
        name: input.name,
        comment: input.comment ?? null,
        configuration: input.configuration ?? null,
      }),
    },
  );
  const parsed = AddProcessingChainResponseSchema.parse(raw);
  return { id: parsed.data.id };
}

/** Patch chain-level fields (name/comment/configuration). */
export async function updateProductionChain(
  chainId: string,
  input: { name?: string; comment?: string | null; configuration?: unknown },
): Promise<void> {
  await apiFetch<unknown>(`/production-chain/${chainId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function updateProcessingChain(
  chainId: string,
  pcId: string,
  input: { name: string },
): Promise<void> {
  await apiFetch<unknown>(
    `/production-chain/${chainId}/processing-chains/${pcId}`,
    { method: 'PATCH', body: JSON.stringify({ name: input.name }) },
  );
}

export async function deleteProcessingChain(
  chainId: string,
  pcId: string,
): Promise<void> {
  await apiFetch<unknown>(
    `/production-chain/${chainId}/processing-chains/${pcId}`,
    { method: 'DELETE' },
  );
}

export async function addEdge(
  chainId: string,
  input: {
    parentChainId: number;
    childChainId: number;
    dependencyMode?: DependencyMode;
    isFanOut?: boolean;
  },
): Promise<{ id: number }> {
  const raw = await apiFetch<unknown>(`/production-chain/${chainId}/edges`, {
    method: 'POST',
    body: JSON.stringify({
      parentChainId: input.parentChainId,
      childChainId: input.childChainId,
      dependencyMode: input.dependencyMode ?? 'OnSuccess',
      isFanOut: input.isFanOut ?? false,
    }),
  });
  const parsed = AddEdgeResponseSchema.parse(raw);
  return { id: parsed.data.id };
}

export async function updateEdge(
  chainId: string,
  edgeId: string,
  input: { dependencyMode?: DependencyMode; isFanOut?: boolean },
): Promise<void> {
  await apiFetch<unknown>(`/production-chain/${chainId}/edges/${edgeId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteEdge(
  chainId: string,
  edgeId: string,
): Promise<void> {
  await apiFetch<unknown>(`/production-chain/${chainId}/edges/${edgeId}`, {
    method: 'DELETE',
  });
}

export type ProcessingScriptOption = {
  id: number;
  acronym: string;
  name: string;
  version: string;
};

export async function listProcessingScripts(): Promise<
  ProcessingScriptOption[]
> {
  const index = await listScriptsWithDefaultVersion();
  return [...index.values()]
    .map((s) => ({
      id: s.id,
      acronym: s.acronym,
      name: s.name,
      version: s.defaultVersion?.version ?? '—',
    }))
    .sort((a, b) => a.acronym.localeCompare(b.acronym));
}
