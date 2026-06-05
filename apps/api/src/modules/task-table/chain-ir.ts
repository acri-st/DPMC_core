import type { ScriptStage, ScriptType, ContainerRuntime } from './canonical-ir';

export interface ChainNodeIr {
  acronym: string;
  name: string;
  scriptType: ScriptType;
  stage: ScriptStage;
  path: string;
  args?: string;
  runtime: ContainerRuntime;
  imageUrl?: string;
  imageTag?: string;
  requiredCpu: number;
  requiredRamBytes: string;
  requiredDiskBytes: string;
  inputTypes: string[];
  outputTypes: string[];
}

export interface ChainEdgeIr {
  parentAcronym: string;
  childAcronym: string;
  matchType: string;
}

export interface ChainParamIr {
  key: string;
  label: string;
  type: 'string' | 'number';
  default?: string | number;
}

export interface ChainIr {
  name: string;
  comment?: string;
  nodes: ChainNodeIr[];
  edges: ChainEdgeIr[];
  parameters: ChainParamIr[];
}
