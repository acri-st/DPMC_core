import { DependencyMode, type Prisma } from '../../dist/client.js';

type EdgeInput = {
  parent: string;
  child: string;
  dependencyMode: DependencyMode;
  isFanOut?: boolean;
};

type ProcessingChainOutput = {
  role: string;
  localName: string;
  contentType: string;
  productTypeAcronym: string;
};

type ProcessingChainNodeInput = {
  name: string;
  configuration?: Prisma.InputJsonValue;
  outputs?: ProcessingChainOutput[];
};

type ProductionChainInput = Pick<
  Prisma.ProductionChainCreateInput,
  'name' | 'comment' | 'isActive'
> & {
  configuration?: Prisma.InputJsonValue;
  edges: EdgeInput[];
  nodes?: ProcessingChainNodeInput[];
};

const baseProductionChains = [
  {
    name: 'Cryosat Ocean',
    comment:
      'Cryosat Ocean is a satellite that measures the temperature of the ocean.',
    configuration: {
      useCase: 'hpc-broker',
      parameters: [
        {
          key: 'brokerUrl',
          label: 'Broker URL',
          type: 'string',
          required: true,
          default: 'http://localhost:8000',
        },
        {
          key: 'scriptPath',
          label: 'Script path',
          type: 'string',
          required: true,
          default: '/lustre/projects/1031/scripts/cryosat_process.sh',
        },
      ],
    },
    edges: [],
    nodes: [{ name: 'CRYOSAT' }],
  },
  {
    name: 'Warhol',
    comment:
      'Dynamic fanout chain: resize → calc → N×tint → combine → publish.',
    configuration: {
      useCase: 'dynamic-fanout',
      // Run the whole chain once per role=input product in the task's
      // DatasetIn: N input images → N independent Warhol grids (one PUBLISH
      // each), rather than processing only the first input.
      fanOutPerInput: true,
      // Every product emitted by a chain run is typed one processing level
      // above the chain's input product: a WARHOL_SAT_L0 input yields
      // WARHOL_SAT_L<n+1> outputs (see WorkerService.recordOutputs).
      incrementProcessingLevel: true,
      parameters: [
        {
          key: 'gridWidth',
          label: 'Grid width',
          type: 'number',
          required: true,
          default: 2,
        },
        {
          key: 'gridHeight',
          label: 'Grid height',
          type: 'number',
          required: true,
          default: 2,
        },
        {
          key: 'colorize',
          label: 'Colorize (%)',
          type: 'number',
          required: true,
          default: 35,
        },
      ],
    },
    edges: [
      {
        parent: 'RESIZE',
        child: 'CALC',
        dependencyMode: DependencyMode.OnSuccess,
      },
      {
        parent: 'CALC',
        child: 'TINT',
        dependencyMode: DependencyMode.OnSuccess,
        isFanOut: true,
      },
      {
        parent: 'TINT',
        child: 'COMBINE',
        dependencyMode: DependencyMode.OnSuccess,
      },
      {
        parent: 'COMBINE',
        child: 'PUBLISH',
        dependencyMode: DependencyMode.OnSuccess,
      },
      {
        parent: 'COMBINE',
        child: 'CLEANUP',
        dependencyMode: DependencyMode.OnFailure,
      },
    ],
    nodes: [
      {
        name: 'RESIZE',
        outputs: [
          {
            role: 'output',
            localName: 'out/RESIZE.png',
            contentType: 'image/png',
            productTypeAcronym: 'IMAGE_RESIZED',
          },
        ],
      },
      {
        name: 'CALC',
        outputs: [
          {
            role: 'output',
            localName: 'out/CALC.json',
            contentType: 'application/json',
            productTypeAcronym: 'CALC_PLAN',
          },
        ],
      },
      {
        name: 'TINT',
        outputs: [
          {
            role: 'output',
            localName: 'out/TINT.png',
            contentType: 'image/png',
            productTypeAcronym: 'IMAGE_TINTED',
          },
        ],
      },
      {
        name: 'COMBINE',
        outputs: [
          {
            role: 'output',
            localName: 'out/COMBINE.png',
            contentType: 'image/png',
            productTypeAcronym: 'IMAGE_COMBINED',
          },
        ],
      },
      {
        name: 'PUBLISH',
        outputs: [
          {
            role: 'output',
            localName: 'out/PUBLISH.json',
            contentType: 'application/json',
            productTypeAcronym: 'PUBLISH_RECEIPT',
          },
        ],
      },
      {
        name: 'CLEANUP',
        outputs: [],
      },
    ],
  },
  {
    name: 'Warhol',
    comment:
      'Dynamic fanout chain: resize → calc → N×tint → combine → publish.',
    configuration: {
      useCase: 'dynamic-fanout',
      // Run the whole chain once per role=input product in the task's
      // DatasetIn: N input images → N independent Warhol grids (one PUBLISH
      // each), rather than processing only the first input.
      fanOutPerInput: true,
      // Every product emitted by a chain run is typed one processing level
      // above the chain's input product: a WARHOL_SAT_L0 input yields
      // WARHOL_SAT_L<n+1> outputs (see WorkerService.recordOutputs).
      incrementProcessingLevel: true,
      parameters: [
        {
          key: 'gridWidth',
          label: 'Grid width',
          type: 'number',
          required: true,
          default: 2,
        },
        {
          key: 'gridHeight',
          label: 'Grid height',
          type: 'number',
          required: true,
          default: 2,
        },
        {
          key: 'colorize',
          label: 'Colorize (%)',
          type: 'number',
          required: true,
          default: 35,
        },
      ],
    },
    edges: [
      {
        parent: 'RESIZE',
        child: 'CALC',
        dependencyMode: DependencyMode.OnSuccess,
      },
      {
        parent: 'CALC',
        child: 'TINT',
        dependencyMode: DependencyMode.OnSuccess,
        isFanOut: true,
      },
      {
        parent: 'TINT',
        child: 'COMBINE',
        dependencyMode: DependencyMode.OnSuccess,
      },
      {
        parent: 'COMBINE',
        child: 'PUBLISH',
        dependencyMode: DependencyMode.OnSuccess,
      },
      {
        parent: 'COMBINE',
        child: 'CLEANUP',
        dependencyMode: DependencyMode.OnFailure,
      },
    ],
    nodes: [
      {
        name: 'RESIZE',
        outputs: [
          {
            role: 'output',
            localName: 'out/RESIZE.png',
            contentType: 'image/png',
            productTypeAcronym: 'IMAGE_RESIZED',
          },
        ],
      },
      {
        name: 'CALC',
        outputs: [
          {
            role: 'output',
            localName: 'out/CALC.json',
            contentType: 'application/json',
            productTypeAcronym: 'CALC_PLAN',
          },
        ],
      },
      {
        name: 'TINT',
        outputs: [
          {
            role: 'output',
            localName: 'out/TINT.png',
            contentType: 'image/png',
            productTypeAcronym: 'IMAGE_TINTED',
          },
        ],
      },
      {
        name: 'COMBINE',
        outputs: [
          {
            role: 'output',
            localName: 'out/COMBINE.png',
            contentType: 'image/png',
            productTypeAcronym: 'IMAGE_COMBINED',
          },
        ],
      },
      {
        name: 'PUBLISH',
        outputs: [
          {
            role: 'output',
            localName: 'out/PUBLISH.json',
            contentType: 'application/json',
            productTypeAcronym: 'PUBLISH_RECEIPT',
          },
        ],
      },
      {
        name: 'CLEANUP',
        outputs: [],
      },
    ],
  },
  {
    name: 'DPMC_TST',
    comment:
      'ESA-type reprocessing chain: sliding-average L0→L1→L2 using DPMC test dataset.',
    isActive: true,
    configuration: {
      processorName: 'DPMC_TST',
      version: '1.0',
      configFile: '/data/dpmc_tst_conf.txt',
    },
    edges: [
      {
        parent: 'IPF_L1',
        child: 'IPF_L2',
        dependencyMode: DependencyMode.OnSuccess,
        isFanOut: false,
      },
    ],
    nodes: [
      {
        name: 'IPF_L1',
        configuration: { mode: 'dir' },
        outputs: [
          {
            role: 'output',
            localName: 'out/*.txt',
            contentType: 'text/plain',
            productTypeAcronym: 'IPF_L1_OUTPUT',
          },
        ],
      },
      {
        name: 'IPF_L2',
        configuration: { mode: 'dir' },
        outputs: [
          {
            role: 'output',
            localName: 'out/*.txt',
            contentType: 'text/plain',
            productTypeAcronym: 'IPF_L2_OUTPUT',
          },
        ],
      },
    ],
  },
  {
    name: 'CryoSat',
    comment:
      'Single-node chain: submit a CryoSat job to the HPC broker and poll it until a terminal state.',
    isActive: true,
    // The broker URL + HPC script path are wired through the executable's CLI
    // args (see CRYOSAT in processing-script.ts), not node configuration —
    // buildExecution() does not forward ProcessingChain node config to the
    // container. These parameters document the chain's intended knobs.
    configuration: {
      useCase: 'hpc-broker',
      parameters: [
        {
          key: 'brokerUrl',
          label: 'Broker URL',
          type: 'string',
          required: true,
          default: 'http://localhost:8000',
        },
        {
          key: 'scriptPath',
          label: 'Script path',
          type: 'string',
          required: true,
          default: '/lustre/projects/1031/scripts/cryosat_process.sh',
        },
        // Read by cryosat_hpc.py via parametersIn: an s3:// (SigV4), http(s), or
        // local path to a .lst manifest whose lines become the job inputs. When
        // omitted the job runs with an empty input list.
        {
          key: 'listPath',
          label: 'Listing (.lst) path',
          type: 'string',
          required: false,
          default: '',
        },
      ],
    },
    edges: [],
    nodes: [{ name: 'CRYOSAT' }],
  },
  {
    name: 'Generic HPC',
    comment:
      'Single-node chain: submit an arbitrary script to the HPC broker and poll to a terminal state. brokerUrl + scriptPath are set per Task via parameters.',
    isActive: true,
    configuration: {
      useCase: 'hpc-broker',
      parameters: [
        {
          key: 'brokerUrl',
          label: 'Broker URL',
          type: 'string',
          required: true,
          default: 'http://localhost:8000',
        },
        {
          key: 'scriptPath',
          label: 'Script path',
          type: 'string',
          required: true,
          default: '/lustre/projects/1031/generic/hello-world.sh',
        },
      ],
    },
    edges: [],
    nodes: [{ name: 'GENERIC_HPC' }],
  },
  {
    name: 'Generic Docker',
    comment:
      'Single-node chain: run an arbitrary command in a Kubernetes container (same backend as Warhol). The command is set per Task via parameters.',
    isActive: true,
    configuration: {
      useCase: 'k8s-command',
      parameters: [
        {
          key: 'command',
          label: 'Command',
          type: 'string',
          required: true,
          default: "echo 'hello from generic-docker'",
        },
      ],
    },
    edges: [],
    nodes: [{ name: 'GENERIC_DOCKER' }],
  },
  {
    name: 'CryoSat Ocean GOP',
    comment:
      "CryoSat Ocean Baseline-D GOP chain: three parallel L0→L1→L2 branches — SIR1SIN_0_→SIR1NGO→IPF2_GOPN (SARIn), SIR1SAR_0_→SIR1SGO→IPF2_GOPR (SAR), SIR1LRM_0_→SIR1LGO→IPF2_GOPM (LRM) — whose L2 products are merged by P2P_GOP into SIR_GOP_2_. One node per IPF Task Table; a task table's internal pools run as sequenced executables of the node's ProcessingScript.",
    isActive: true,
    // All seven task tables are transcribed: the three L1 GOP ones from
    // data/cryosat-ocean/components/processors/task_tables (COP IPF1 v4.24)
    // and the IPF2/P2P ones (COP IPF2 v4.27).
    configuration: {
      mission: 'CryoSat-2',
      baseline: 'D',
      package: 'cryosat_ocean_baseline_d',
    },
    edges: [
      {
        parent: 'SIR1NGO',
        child: 'IPF2_GOPN',
        dependencyMode: DependencyMode.OnSuccess,
        isFanOut: false,
      },
      {
        parent: 'SIR1SGO',
        child: 'IPF2_GOPR',
        dependencyMode: DependencyMode.OnSuccess,
        isFanOut: false,
      },
      {
        parent: 'SIR1LGO',
        child: 'IPF2_GOPM',
        dependencyMode: DependencyMode.OnSuccess,
        isFanOut: false,
      },
      // P2P_GOP only needs at least one mode L2 product (its per-mode inputs
      // are optional in the task table), so it waits for the three IPF2 jobs
      // to reach a terminal state and merges whichever products exist rather
      // than being skipped when one branch fails (OnSuccess semantics).
      {
        parent: 'IPF2_GOPN',
        child: 'P2P_GOP',
        dependencyMode: DependencyMode.OnCompletion,
        isFanOut: false,
      },
      {
        parent: 'IPF2_GOPR',
        child: 'P2P_GOP',
        dependencyMode: DependencyMode.OnCompletion,
        isFanOut: false,
      },
      {
        parent: 'IPF2_GOPM',
        child: 'P2P_GOP',
        dependencyMode: DependencyMode.OnCompletion,
        isFanOut: false,
      },
    ],
    nodes: [
      // ── SARIn branch ────────────────────────────────────────────────────
      {
        // Transcribed from TaskTable.SIR_SGO.xml — note the file name: it
        // declares Processor_Name SIR1NGO (SARIn). COP IPF1 v4.24, 6
        // sequential pools. COP1_SRNP's 37 disabled breakpoint outputs are
        // omitted.
        name: 'SIR1NGO',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'SIR1NGO',
            version: '4.24',
            minDiskSpaceMB: 1024,
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/config_files/CS_OPER_PCONF_IPF1_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF1_PR_SRP',
                version: '04.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR1SIN_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR2SIN_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1TKSI0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [
                  { fileType: 'INT1SIN_L0', destination: 'PROC' },
                  { fileType: 'INT2SIN_L0', destination: 'PROC' },
                  { fileType: 'INTERI0_L1', destination: 'PROC' },
                ],
              },
              {
                // The INT2SIN_L0 PROC input is commented out in the task
                // table and therefore not transcribed.
                name: 'IPF1_SP_COP',
                version: '04.20',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT1SIN_L0',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INTERI0_L1',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_DORUSO',
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        retrievalMode: 'LatestValCover',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        retrievalMode: 'LatestValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 2,
                        retrievalMode: 'LatestValidityClosest',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'SIR1SIC21B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR_SIC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_SURFPS',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_SEAMPS',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_WETTRP',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_U_WIND',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_V_WIND',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ALTGRD',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_MOG_2D',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_POLLOC',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IONGIM',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [
                  { fileType: 'INT_GOP_1B', destination: 'PROC' },
                  { fileType: 'INTERI1_L1', destination: 'PROC' },
                ],
              },
              {
                name: 'COP1_PR_SRN',
                version: '02.20',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR1SIN_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR2SIN_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        fileType: 'SIR1TKSI0_',
                        retrievalMode: 'ValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        fileType: 'SIR2TKSI0_',
                        retrievalMode: 'ValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'SIR_SIC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'STR_ATTCOP',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_DORUSO',
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        retrievalMode: 'LatestValCover',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        retrievalMode: 'LatestValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 2,
                        retrievalMode: 'LatestValidityClosest',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR_SICC1B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                ],
                outputs: [{ fileType: 'INT_SIN_FR', destination: 'PROC' }],
              },
              {
                name: 'COP1_SRNP',
                version: '02.11',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT_SIN_FR',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'STR_ATTCOP',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR_SIC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'SIR_SICC1B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'SIR1SIC21B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'SIR2SIC21B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                ],
                outputs: [{ fileType: 'INT_SIN_1B', destination: 'PROC' }],
              },
              {
                name: 'IPF1_PP_COP',
                version: '04.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT_SIN_1B',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INT_GOP_1B',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INTERI1_L1',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOPN1B', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOPN1B*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOPN1B',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
      {
        // Transcribed from TaskTable.IPF2GOPN.xml (COP IPF2 v4.27, 3
        // sequential pools). Task-table paths (/mount/psi/data/exports2/…/dev)
        // are normalized to the baked /dpmc/scripts layout of the
        // cryosat-ocean image.
        name: 'IPF2_GOPN',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'IPF2_GOPN',
            version: '4.27',
            minDiskSpaceMB: 1024,
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/CS_OPER_PCONF_IPF2_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF2_SP_COP',
                version: '04.23',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR_GOPN1B',
                    origin: 'DB',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_GPDWTC',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'INT_GOP_2_', destination: 'PROC' }],
              },
              {
                name: 'IPF2_PP_COP',
                version: '04.12',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR_GOPN1B',
                    origin: 'DB',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INT_GOP_2_',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOPN_2', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOPN_2*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOPN_2',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
      // ── SAR branch ──────────────────────────────────────────────────────
      {
        // Transcribed from TaskTable.SIR1SGO.xml (COP IPF1 v4.24, 6
        // sequential pools). COP1_SARP's 28 disabled breakpoint outputs are
        // omitted.
        name: 'SIR1SGO',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'SIR1SGO',
            version: '4.24',
            minDiskSpaceMB: 1024,
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/config_files/CS_OPER_PCONF_IPF1_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF1_PR_SOP',
                version: '04.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR1SAR_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1TKSA0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [
                  { fileType: 'INT1SAR_L0', destination: 'PROC' },
                  { fileType: 'INTERI0_L1', destination: 'PROC' },
                ],
              },
              {
                name: 'IPF1_SP_COP',
                version: '04.20',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT1SAR_L0',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INTERI0_L1',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_DORUSO',
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        retrievalMode: 'LatestValCover',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        retrievalMode: 'LatestValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 2,
                        retrievalMode: 'LatestValidityClosest',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'SIR1SAC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1SAC21B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_SURFPS',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_SEAMPS',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_WETTRP',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_U_WIND',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_V_WIND',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ALTGRD',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_MOG_2D',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_POLLOC',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IONGIM',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [
                  { fileType: 'INT_GOP_1B', destination: 'PROC' },
                  { fileType: 'INTERI1_L1', destination: 'PROC' },
                ],
              },
              {
                name: 'COP1_PR_SAR',
                version: '02.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR1SAR_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1TKSA0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1SAC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'STR_ATTCOP',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_DORUSO',
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        retrievalMode: 'LatestValCover',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        retrievalMode: 'LatestValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 2,
                        retrievalMode: 'LatestValidityClosest',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR_SICC1B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                ],
                outputs: [{ fileType: 'INT1SAR_FR', destination: 'PROC' }],
              },
              {
                name: 'COP1_SARP',
                version: '02.11',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT1SAR_FR',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'STR_ATTCOP',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1SAC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'SIR1SAC21B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                ],
                outputs: [{ fileType: 'INT_SAR_1B', destination: 'PROC' }],
              },
              {
                name: 'IPF1_PP_COP',
                version: '04.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT_SAR_1B',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INT_GOP_1B',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INTERI1_L1',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOPR1B', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOPR1B*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOPR1B',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
      {
        // Transcribed from TaskTable.IPF2GOPR.xml — identical to IPF2_GOPN
        // except for the L1B/L2 product types (SIR_GOPR1B → SIR_GOPR_2).
        name: 'IPF2_GOPR',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'IPF2_GOPR',
            version: '4.27',
            minDiskSpaceMB: 1024,
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/CS_OPER_PCONF_IPF2_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF2_SP_COP',
                version: '04.23',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR_GOPR1B',
                    origin: 'DB',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_GPDWTC',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'INT_GOP_2_', destination: 'PROC' }],
              },
              {
                name: 'IPF2_PP_COP',
                version: '04.12',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR_GOPR1B',
                    origin: 'DB',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INT_GOP_2_',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOPR_2', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOPR_2*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOPR_2',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
      // ── LRM branch ──────────────────────────────────────────────────────
      {
        // Transcribed from the SIR1LGO IPF Task Table (COP IPF1 v4.24, 4
        // sequential pools). Inputs with origin PROC are task-table-internal
        // intermediates; only DB-destination outputs surface as DPMC products.
        name: 'SIR1LGO',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'SIR1LGO',
            version: '4.24',
            minDiskSpaceMB: 1024,
            // 0 = no execution time limit (Task Table Max_Time)
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/config_files/CS_OPER_PCONF_IPF1_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF1_PR_LOP',
                version: '04.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR1LRM_0_',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [
                  { fileType: 'INT1LRM_L0', destination: 'PROC' },
                  { fileType: 'INTERI0_L1', destination: 'PROC' },
                ],
              },
              {
                name: 'IPF1_SP_COP',
                version: '04.20',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT1LRM_L0',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INTERI0_L1',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_DORUSO',
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        retrievalMode: 'LatestValCover',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        retrievalMode: 'LatestValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 2,
                        retrievalMode: 'LatestValidityClosest',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'SIR1LRC11B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'SIR1SAC21B',
                    origin: 'DB',
                    retrievalMode: 'LatestValidityClosest',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  // t0/t1 = 21601 s ≈ 6 h search window around the sensing interval
                  {
                    fileType: 'AUX_SURFPS',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_SEAMPS',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_WETTRP',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_U_WIND',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_V_WIND',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ALTGRD',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_MOG_2D',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 21601,
                    t1: 21601,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_POLLOC',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IONGIM',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [
                  { fileType: 'INT_GOP_1B', destination: 'PROC' },
                  { fileType: 'INTERI1_L1', destination: 'PROC' },
                ],
              },
              {
                name: 'IPF1_PP_COP',
                version: '04.10',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'INT_GOP_1B',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INTERI1_L1',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOPM1B', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOPM1B*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOPM1B',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
      {
        // Transcribed from TaskTable.IPF2GOPM.xml — identical to IPF2_GOPN
        // except for the L1B/L2 product types (SIR_GOPM1B → SIR_GOPM_2).
        name: 'IPF2_GOPM',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'IPF2_GOPM',
            version: '4.27',
            minDiskSpaceMB: 1024,
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/CS_OPER_PCONF_IPF2_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF2_SP_COP',
                version: '04.23',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR_GOPM1B',
                    origin: 'DB',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_GPDWTC',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'INT_GOP_2_', destination: 'PROC' }],
              },
              {
                name: 'IPF2_PP_COP',
                version: '04.12',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'SIR_GOPM1B',
                    origin: 'DB',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'INT_GOP_2_',
                    origin: 'PROC',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOPM_2', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOPM_2*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOPM_2',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
      // ── Merge ───────────────────────────────────────────────────────────
      {
        // Transcribed from TaskTable.P2PGOP.xml (COP IPF2 v4.27, 2 sequential
        // pools). At least one mode L2 product is required (first input, 3
        // ordered alternatives); the per-mode inputs are then optional so the
        // merge runs with whichever of GOPM/GOPR/GOPN are present.
        name: 'P2P_GOP',
        configuration: {
          // Resolved against the API's DPMC_STATIC_VOLUMES name → path map.
          staticVolumes: [
            {
              name: 'cryosat-sad',
              target: '/data/cryosat-sad',
              readOnly: true,
            },
          ],
          taskTable: {
            processorName: 'P2P_GOP',
            version: '4.27',
            minDiskSpaceMB: 1024,
            maxTimeSec: 0,
            configFile:
              '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/CS_OPER_PCONF_IPF2_20130304T000000_99999999T999999_0003.XML',
            configSpaces: ['Geophysical_Constants'],
            dynamicProcessingParameters: { Baseline: 'D' },
            productNamePrefix: 'CS_OPER',
            configSpaceFiles: {
              Geophysical_Constants:
                '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/config_files/Alternate_Geophysical_Constants_3.0.xml',
            },
            tasks: [
              {
                name: 'IPF2_P2PCOP',
                version: '04.12',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    origin: 'DB',
                    mandatory: true,
                    alternatives: [
                      {
                        order: 0,
                        fileType: 'SIR_GOPM_2',
                        retrievalMode: 'ValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 1,
                        fileType: 'SIR_GOPR_2',
                        retrievalMode: 'ValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                      {
                        order: 2,
                        fileType: 'SIR_GOPN_2',
                        retrievalMode: 'ValIntersect',
                        t0: 0,
                        t1: 0,
                      },
                    ],
                  },
                  {
                    fileType: 'SIR_GOPM_2',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'SIR_GOPR_2',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'SIR_GOPN_2',
                    origin: 'DB',
                    retrievalMode: 'ValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: false,
                  },
                  {
                    fileType: 'AUX_IPFDBA',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_IPFDBB',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBREF',
                    origin: 'DB',
                    retrievalMode: 'LatestValIntersect',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'MPL_ORBPRE',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                  {
                    fileType: 'AUX_ORBDOR',
                    origin: 'DB',
                    retrievalMode: 'LatestValCover',
                    t0: 300,
                    t1: 300,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIR_GOP_2_', destination: 'DB' }],
              },
              {
                name: 'IPF_REPORT_GENERATOR',
                version: '02.01',
                critical: true,
                criticalityLevel: 1,
                killingSignal: 15,
                inputs: [
                  {
                    fileType: 'LOG',
                    origin: 'LOG',
                    retrievalMode: 'ValCover',
                    t0: 0,
                    t1: 0,
                    mandatory: true,
                  },
                ],
                outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
              },
            ],
          },
        },
        outputs: [
          {
            role: 'output',
            localName: 'out/CS_*SIR_GOP_2_*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIR_GOP_2_',
          },
          {
            role: 'output',
            localName: 'out/CS_*SIRPRODRPT*',
            contentType: 'application/octet-stream',
            productTypeAcronym: 'SIRPRODRPT',
          },
        ],
      },
    ],
  },
] satisfies ProductionChainInput[];

// ── CryoSat Ocean GOP SIR1LGO ─────────────────────────────────────────────
// LRM-only variant of the GOP chain, derived from the full definition: the
// available campaign data (HPC archive, .lst input sets) is SIR1LRM_0_-only,
// so the SAR/SARIn branches can never run. Same transcribed nodes/edges,
// restricted to SIR1LGO → IPF2_GOPM → P2P_GOP.
const GOP_LRM_NODES = new Set(['SIR1LGO', 'IPF2_GOPM', 'P2P_GOP']);
const cryosatOceanGop = baseProductionChains.find(
  (c) => c.name === 'CryoSat Ocean GOP',
);
if (!cryosatOceanGop) throw new Error('CryoSat Ocean GOP chain not found');
const cryosatOceanGopLrm = {
  ...cryosatOceanGop,
  name: 'CryoSat Ocean GOP SIR1LGO',
  comment:
    'LRM-only CryoSat Ocean Baseline-D GOP chain: SIR1LRM_0_→SIR1LGO→IPF2_GOPM→P2P_GOP→SIR_GOP_2_. Derived from the full GOP chain for campaigns where only LRM L0 products are archived.',
  edges: cryosatOceanGop.edges.filter(
    (e) => GOP_LRM_NODES.has(e.parent) && GOP_LRM_NODES.has(e.child),
  ),
  nodes: cryosatOceanGop.nodes.filter((n) => GOP_LRM_NODES.has(n.name)),
} satisfies ProductionChainInput;

export const productionChains = [
  ...baseProductionChains,
  cryosatOceanGopLrm,
] satisfies ProductionChainInput[];
