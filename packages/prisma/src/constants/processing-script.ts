import { ContainerRuntime, ScriptType, ScriptStage, type Prisma } from "../../dist/client.js";

type ExecutableSeed = Omit<
  Prisma.ProcessingScriptExecutableUncheckedCreateInput,
  "id" | "processingScriptVersionId" | "sequence"
> & { sequence: number };

type VersionSeed = Omit<
  Prisma.ProcessingScriptVersionUncheckedCreateInput,
  "id" | "processingScriptId" | "executables"
> & { executables: ExecutableSeed[] };

export type ProcessingScriptSeed = Omit<
  Prisma.ProcessingScriptUncheckedCreateInput,
  "id" | "defaultVersionId" | "versions" | "processingChains"
> & { versions: VersionSeed[] };

const MB = 1024n * 1024n;
const GB = 1024n * MB;

const dockerBase = {
  runtime: ContainerRuntime.Docker,
  imageUrl: "dpmc-warhol",
  imageTag: "dev",
} as const;

export const processingScripts: ProcessingScriptSeed[] = [
  {
    name: "Image resize",
    acronym: "RESIZE",
    versions: [{
      version: "1.0.0",
      isLatest: true,
      ...dockerBase,
      requiredCpu: 1,
      requiredRam: 512n * MB,
      requiredDisk: 100n * MB,
      executables: [{
        scriptType: ScriptType.Python,
        path: "/app/main.py",
        name: "resize",
        sequence: 0,
        args: null,
      }],
    }],
  },
  {
    name: "Grid calculator",
    acronym: "CALC",
    versions: [{
      version: "1.0.0",
      isLatest: true,
      ...dockerBase,
      requiredCpu: 1,
      requiredRam: 256n * MB,
      requiredDisk: 10n * MB,
      executables: [{
        scriptType: ScriptType.Python,
        path: "/app/main.py",
        name: "calc",
        sequence: 0,
        args: '--grid-width 2 --grid-height 2 --colorize 35',
      }],
    }],
  },
  {
    name: "Tint",
    acronym: "TINT",
    versions: [{
      version: "1.0.0",
      isLatest: true,
      ...dockerBase,
      requiredCpu: 1,
      requiredRam: 512n * MB,
      requiredDisk: 100n * MB,
      executables: [{
        scriptType: ScriptType.Python,
        path: "/app/main.py",
        name: "tint",
        sequence: 0,
        args: null,
      }],
    }],
  },
  {
    name: "Grid combine",
    acronym: "COMBINE",
    versions: [{
      version: "1.0.0",
      isLatest: true,
      ...dockerBase,
      requiredCpu: 2,
      requiredRam: 1n * GB,
      requiredDisk: 200n * MB,
      executables: [{
        scriptType: ScriptType.Python,
        path: "/app/main.py",
        name: "combine",
        sequence: 0,
        args: null,
      }],
    }],
  },
  {
    name: "Publish",
    acronym: "PUBLISH",
    versions: [{
      version: "1.0.0",
      isLatest: true,
      ...dockerBase,
      requiredCpu: 1,
      requiredRam: 256n * MB,
      requiredDisk: 50n * MB,
      executables: [{
        scriptType: ScriptType.Python,
        path: "/app/main.py",
        name: "publish",
        sequence: 0,
        args: null,
      }],
    }],
  },
  {
    name: "Cleanup",
    acronym: "CLEANUP",
    versions: [{
      version: "1.0.0",
      isLatest: true,
      ...dockerBase,
      requiredCpu: 1,
      requiredRam: 256n * MB,
      requiredDisk: 10n * MB,
      executables: [{
        scriptType: ScriptType.Python,
        path: "/app/main.py",
        name: "cleanup",
        sequence: 0,
        args: null,
      }],
    }],
  },
  {
    name: "DPMC TST Level-1 processor",
    acronym: "IPF_L1",
    versions: [
      {
        version: "1.0.0",
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: "dpmc-dpmc-tst",
        imageTag: "dev",
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 200n * MB,
        executables: [
          {
            scriptType: ScriptType.Bash,
            stage: ScriptStage.Exe,
            path: "/usr/local/components/IPF_L1/bin/L1.sh",
            name: "L1",
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: "DPMC TST Level-2 processor",
    acronym: "IPF_L2",
    versions: [
      {
        version: "1.0.0",
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: "dpmc-dpmc-tst",
        imageTag: "dev",
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 200n * MB,
        executables: [
          {
            scriptType: ScriptType.Bash,
            stage: ScriptStage.Exe,
            path: "/usr/local/components/IPF_L2/bin/L2.sh",
            name: "L2",
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
];
