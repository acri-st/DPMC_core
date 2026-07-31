import type { DependencyMode, ProductionChainKind } from '@dpmc/client';

export type { DependencyMode, ProductionChainKind };

export type ScriptType =
  | 'Bash'
  | 'Python'
  | 'Node'
  | 'Binary'
  | 'PgBash'
  | 'PlSql'
  | 'Sql';

export type ScriptStage = 'Pre' | 'Exe' | 'Post';

export type ProcessingScriptExecutableInfo = {
  id: string;
  scriptType: ScriptType;
  stage: ScriptStage;
  name: string;
  path: string;
  sequence: number;
  args: string | null;
};

export type ProductionChainSummary = {
  id: number;
  name: string;
  comment: string | null;
  isActive: boolean;
  kind: ProductionChainKind;
  createdAt: string;
  updatedAt: string;
};

export type ProcessingScriptIO = {
  /** Free-form keyword the script consumes/produces. */
  keyword: string;
  /** Human description shown in the side panel. */
  description?: string;
  /** Mime/extension hint (csv, json, parquet, …). */
  format?: string;
};

export type ProcessingScriptNode = {
  id: string;
  /** Node label (the ProcessingChain.name) */
  acronym: string;
  name: string;
  /** Version display (e.g. "1.2") */
  version: string;
  scriptType: ScriptType;
  isInDocker: boolean;
  dockerImage: string | null;
  requiredCpu: number;
  requiredRam: number;
  requiredDisk: number;
  inputs: ProcessingScriptIO[];
  outputs: ProcessingScriptIO[];
  executables: ProcessingScriptExecutableInfo[];
  isFanOutTarget: boolean;
};

export type ProductionChainGraphEdge = {
  id: string;
  source: string;
  target: string;
  dependencyMode: DependencyMode;
  isFanOut: boolean;
};

export type ProductionChainVersionInfo = {
  id: string;
  version: string;
  isLatest: boolean;
  configuration: Record<string, unknown> | null;
};

export type ProductionChainGraph = ProductionChainSummary & {
  configuration: Record<string, unknown> | null;
  scripts: ProcessingScriptNode[];
  edges: ProductionChainGraphEdge[];
  versions: ProductionChainVersionInfo[];
  /** The version currently rendered. */
  selectedVersion: ProductionChainVersionInfo | null;
};
