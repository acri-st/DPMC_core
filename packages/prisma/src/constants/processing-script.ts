import {
  ContainerRuntime,
  ScriptType,
  ScriptStage,
  type Prisma,
} from '../../dist/client.js';

type ExecutableSeed = Omit<
  Prisma.ProcessingScriptExecutableUncheckedCreateInput,
  'id' | 'processingScriptVersionId' | 'sequence'
> & { sequence: number };

type VersionSeed = Omit<
  Prisma.ProcessingScriptVersionUncheckedCreateInput,
  'id' | 'processingScriptId' | 'executables'
> & { executables: ExecutableSeed[] };

export type ProcessingScriptSeed = Omit<
  Prisma.ProcessingScriptUncheckedCreateInput,
  'id' | 'defaultVersionId' | 'versions' | 'processingChains'
> & { versions: VersionSeed[] };

const MB = 1024n * 1024n;
const GB = 1024n * MB;

// imageUrl is the FULL Harbor reference and imageTag the deployed channel: the
// k8s worker backend passes the image to the job pod verbatim (no registry
// prefixing — see backends/kubernetes.py), so a bare name would resolve to
// docker.io and ImagePullBackOff. Images are built & pushed by the per-service
// build-* CI jobs and pulled via the worker's harbor-pull-secret.
export const processingScripts: ProcessingScriptSeed[] = [
  {
    name: 'Image resize',
    acronym: 'RESIZE',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/warhol',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 512n * MB,
        requiredDisk: 100n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            path: '/dpmc/scripts/resize/1.0.0/main.py',
            name: 'resize',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'Grid calculator',
    acronym: 'CALC',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/warhol',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 10n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            path: '/dpmc/scripts/calc/1.0.0/main.py',
            name: 'calc',
            sequence: 0,
            args: '--grid-width 2 --grid-height 2 --colorize 35',
          },
        ],
      },
    ],
  },
  {
    name: 'Tint',
    acronym: 'TINT',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/warhol',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 512n * MB,
        requiredDisk: 100n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            path: '/dpmc/scripts/tint/1.0.0/main.py',
            name: 'tint',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'Grid combine',
    acronym: 'COMBINE',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/warhol',
        imageTag: 'development',
        requiredCpu: 2,
        requiredRam: 1n * GB,
        requiredDisk: 200n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            path: '/dpmc/scripts/combine/1.0.0/main.py',
            name: 'combine',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'Publish',
    acronym: 'PUBLISH',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/warhol',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 50n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            path: '/dpmc/scripts/publish/1.0.0/main.py',
            name: 'publish',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'Cleanup',
    acronym: 'CLEANUP',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/warhol',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 10n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            path: '/dpmc/scripts/cleanup/1.0.0/main.py',
            name: 'cleanup',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'DPMC TST Level-1 processor',
    acronym: 'IPF_L1',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/dpmc-tst',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 200n * MB,
        executables: [
          {
            scriptType: ScriptType.Bash,
            stage: ScriptStage.Exe,
            path: '/usr/local/components/IPF_L1/bin/L1.sh',
            name: 'L1',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat HPC broker client',
    acronym: 'CRYOSAT',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 100n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_hpc.py',
            name: 'cryosat',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'Generic HPC broker client',
    acronym: 'GENERIC_HPC',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/generic-hpc',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 100n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/generic_hpc.py',
            name: 'generic-hpc',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'Generic Docker job',
    acronym: 'GENERIC_DOCKER',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/generic-docker',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 100n * MB,
        executables: [
          {
            scriptType: ScriptType.Python,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/generic_docker.py',
            name: 'generic-docker',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
  // CryoSat Ocean Baseline-D GOP processors — one ProcessingScript per IPF
  // Task Table, whose pools map to sequenced executables. The binaries are
  // baked under /dpmc/scripts (baked execution mode, k8s-capable) in one
  // image per ESA delivery package: cryosat-ocean-ipf1 (COP IPF1 V4.24, the
  // three L1 scripts) and cryosat-ocean-ipf2 (COP IPF2 V4.27, the four L2
  // scripts), both extending cryosat-ocean-runtime (i386 stretch userland +
  // vendor so/ libs). See data/cryosat-ocean/Dockerfile.{runtime,ipf1,ipf2};
  // build-* CI jobs still to be created. All distinct from dpmc/cryosat (the
  // HPC broker client). Task-table paths (/mount/psi/data/exports2/…/dev)
  // are normalized to the baked /dpmc/scripts layout.
  {
    // Pools of TaskTable.SIR_SGO.xml (Processor_Name SIR1NGO, SARIn).
    name: 'CryoSat Ocean L1 GOP processor (SARIn)',
    acronym: 'SIR1NGO',
    versions: [
      {
        version: '4.24',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf1',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_SRP_04_10',
            name: 'ipf1-pr-srp',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_SP_COP_04_20',
            name: 'ipf1-sp-cop',
            sequence: 1,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/COP1_PR_SRN_02_20',
            name: 'cop1-pr-srn',
            sequence: 2,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/COP1_SRNP_02_11',
            name: 'cop1-srnp',
            sequence: 3,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PP_COP_04_10',
            name: 'ipf1-pp-cop',
            sequence: 4,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 5,
            args: null,
          },
        ],
      },
    ],
  },
  {
    // Pools of TaskTable.SIR1SGO.xml (SAR).
    name: 'CryoSat Ocean L1 GOP processor (SAR)',
    acronym: 'SIR1SGO',
    versions: [
      {
        version: '4.24',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf1',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_SOP_04_10',
            name: 'ipf1-pr-sop',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_SP_COP_04_20',
            name: 'ipf1-sp-cop',
            sequence: 1,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/COP1_PR_SAR_02_10',
            name: 'cop1-pr-sar',
            sequence: 2,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/COP1_SARP_02_11',
            name: 'cop1-sarp',
            sequence: 3,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PP_COP_04_10',
            name: 'ipf1-pp-cop',
            sequence: 4,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 5,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat Ocean L1 GOP processor (LRM)',
    acronym: 'SIR1LGO',
    versions: [
      {
        version: '4.24',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf1',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_LOP_04_10',
            name: 'ipf1-pr-lop',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_SP_COP_04_20',
            name: 'ipf1-sp-cop',
            sequence: 1,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PP_COP_04_10',
            name: 'ipf1-pp-cop',
            sequence: 2,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 3,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat Ocean L2 GOP processor (SARIn)',
    acronym: 'IPF2_GOPN',
    versions: [
      {
        version: '4.27',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf2',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_SP_COP_04_23',
            name: 'ipf2-sp-cop',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_PP_COP_04_12',
            name: 'ipf2-pp-cop',
            sequence: 1,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 2,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat Ocean L2 GOP processor (SAR)',
    acronym: 'IPF2_GOPR',
    versions: [
      {
        version: '4.27',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf2',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_SP_COP_04_23',
            name: 'ipf2-sp-cop',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_PP_COP_04_12',
            name: 'ipf2-pp-cop',
            sequence: 1,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 2,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat Ocean L2 GOP processor (LRM)',
    acronym: 'IPF2_GOPM',
    versions: [
      {
        version: '4.27',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf2',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_SP_COP_04_23',
            name: 'ipf2-sp-cop',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_PP_COP_04_12',
            name: 'ipf2-pp-cop',
            sequence: 1,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 2,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat Ocean GOP product merger',
    acronym: 'P2P_GOP',
    versions: [
      {
        version: '4.27',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl:
          'harbor.shared.acrist-services.com/dsy/damps/dpmc/cryosat-ocean-ipf2',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 2n * GB,
        requiredDisk: 1n * GB,
        executables: [
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_P2PCOP_04_12',
            name: 'ipf2-p2pcop',
            sequence: 0,
            args: null,
          },
          {
            scriptType: ScriptType.Binary,
            stage: ScriptStage.Exe,
            path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF_REPORT_GENERATOR_02_01',
            name: 'ipf-report-generator',
            sequence: 1,
            args: null,
          },
        ],
      },
    ],
  },
  {
    name: 'DPMC TST Level-2 processor',
    acronym: 'IPF_L2',
    versions: [
      {
        version: '1.0.0',
        isLatest: true,
        runtime: ContainerRuntime.Docker,
        imageUrl: 'harbor.shared.acrist-services.com/dsy/damps/dpmc/dpmc-tst',
        imageTag: 'development',
        requiredCpu: 1,
        requiredRam: 256n * MB,
        requiredDisk: 200n * MB,
        executables: [
          {
            scriptType: ScriptType.Bash,
            stage: ScriptStage.Exe,
            path: '/usr/local/components/IPF_L2/bin/L2.sh',
            name: 'L2',
            sequence: 0,
            args: null,
          },
        ],
      },
    ],
  },
];
