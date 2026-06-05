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

export const productionChains = [
  {
    name: 'Warhol',
    comment: 'Dynamic fanout chain: resize → calc → N×tint → combine → publish.',
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
        { key: 'gridWidth',  label: 'Grid width',   type: 'number', required: true,  default: 2 },
        { key: 'gridHeight', label: 'Grid height',  type: 'number', required: true,  default: 2 },
        { key: 'colorize',   label: 'Colorize (%)', type: 'number', required: true,  default: 35 },
      ],
    },
    edges: [
      { parent: 'RESIZE',  child: 'CALC',    dependencyMode: DependencyMode.OnSuccess },
      { parent: 'CALC',    child: 'TINT',    dependencyMode: DependencyMode.OnSuccess, isFanOut: true },
      { parent: 'TINT',    child: 'COMBINE', dependencyMode: DependencyMode.OnSuccess },
      { parent: 'COMBINE', child: 'PUBLISH', dependencyMode: DependencyMode.OnSuccess },
      { parent: 'COMBINE', child: 'CLEANUP', dependencyMode: DependencyMode.OnFailure },
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
    name: "DPMC_TST",
    comment: "ESA-type reprocessing chain: sliding-average L0→L1→L2 using DPMC test dataset.",
    isActive: true,
    configuration: {
      processorName: "DPMC_TST",
      version: "1.0",
      configFile: "/data/dpmc_tst_conf.txt",
    },
    edges: [
      { parent: "IPF_L1", child: "IPF_L2", dependencyMode: DependencyMode.OnSuccess, isFanOut: false },
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
] satisfies ProductionChainInput[];
