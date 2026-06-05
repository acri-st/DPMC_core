export type ScriptType =
  | 'Bash'
  | 'Pgbash'
  | 'Plsql'
  | 'Sql'
  | 'Python'
  | 'Binary';
export type ScriptStage = 'Pre' | 'Exe' | 'Post';
export type ContainerRuntime = 'Docker' | 'Apptainer' | 'None';

export interface IrExecutable {
  scriptType: ScriptType;
  stage: ScriptStage;
  path: string;
  name: string;
  sequence: number;
  args?: string;
}

export interface IrProcessingScript {
  name: string;
  acronym: string;
}

export interface IrProcessingScriptVersion {
  version: string;
  runtime: ContainerRuntime;
  imageUrl?: string;
  imageTag?: string;
  requiredCpu: number;
  requiredRam: bigint;
  requiredDisk: bigint;
}

export interface IrProcessingChain {
  name: string;
}

export interface CanonicalIR {
  processingScript: IrProcessingScript;
  processingScriptVersion: IrProcessingScriptVersion;
  executables: IrExecutable[];
  processingChain: IrProcessingChain;
}
