import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildAcsChainPlan,
  isAcsTaskTable,
  parseAcsTaskTable,
  rerootPath,
} from './acs';

const fixture = (name: string) =>
  readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

const SIR1LGO = fixture('TaskTable.SIR1LGO.xml');
const IPF2GOPM = fixture('TaskTable.IPF2GOPM.xml');
const P2PGOP = fixture('TaskTable.P2PGOP.xml');

const INSTALL_ROOT = '/dpmc/scripts/cryosat_ocean_baseline_d';

describe('isAcsTaskTable', () => {
  it('recognises the old-ACS root and rejects the Sentinel-style one', () => {
    expect(isAcsTaskTable(SIR1LGO)).toBe(true);
    expect(isAcsTaskTable('<Ipf_Task_Table></Ipf_Task_Table>')).toBe(false);
  });
});

describe('parseAcsTaskTable (real SIR1LGO delivery)', () => {
  const tt = parseAcsTaskTable(SIR1LGO, 'TaskTable.SIR1LGO.xml');

  it('parses the header', () => {
    expect(tt.processorName).toBe('SIR1LGO');
    expect(tt.version).toBe('4.24');
    expect(tt.minDiskSpaceMB).toBe(1024);
    expect(tt.maxTimeSec).toBe(0);
    expect(tt.configSpaces).toEqual(['Geophysical_Constants']);
    expect(tt.configFileVersion).toBe('3.0');
  });

  it('flattens the four pools into sequenced tasks', () => {
    expect(tt.tasks.map((t) => t.name)).toEqual([
      'IPF1_PR_LOP',
      'IPF1_SP_COP',
      'IPF1_PP_COP',
      'IPF_REPORT_GENERATOR',
    ]);
    expect(tt.tasks.map((t) => t.version)).toEqual([
      '04.10',
      '04.20',
      '04.10',
      '02.01',
    ]);
  });

  it('keeps input origins, retrieval modes, windows and mandatory flags', () => {
    const prLop = tt.tasks[0];
    expect(prLop.inputs[0]).toMatchObject({
      fileType: 'SIR1LRM_0_',
      origin: 'DB',
      retrievalMode: 'ValIntersect',
      mandatory: true,
    });
    const orbdor = prLop.inputs.find((i) => i.fileType === 'AUX_ORBDOR');
    expect(orbdor).toMatchObject({ t0: 300, t1: 300 });
  });

  it('collapses same-type ordered alternatives (AUX_DORUSO)', () => {
    const spCop = tt.tasks[1];
    const doruso = spCop.inputs.find((i) => i.fileType === 'AUX_DORUSO');
    expect(doruso?.alternatives).toHaveLength(3);
    expect(doruso?.alternatives?.map((a) => a.retrievalMode)).toEqual([
      'LatestValCover',
      'LatestValIntersect',
      'LatestValidityClosest',
    ]);
    expect(doruso?.alternatives?.[0]).not.toHaveProperty('fileType');
  });

  it('keeps PROC intermediates and DB/LOG destinations', () => {
    expect(tt.tasks[0].outputs).toEqual([
      { fileType: 'INT1LRM_L0', destination: 'PROC' },
      { fileType: 'INTERI0_L1', destination: 'PROC' },
    ]);
    expect(tt.tasks[3].inputs[0].origin).toBe('LOG');
    expect(tt.tasks[2].outputs).toEqual([
      { fileType: 'SIR_GOPM1B', destination: 'DB' },
    ]);
  });
});

describe('rerootPath', () => {
  it('replaces everything before /Binaries/ with the install root', () => {
    expect(
      rerootPath(
        '/exports/dpmc/scripts/specific-package/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_LOP_04_10',
        INSTALL_ROOT,
      ),
    ).toBe(
      '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_LOP_04_10',
    );
    expect(
      rerootPath(
        '/mount/psi/data/exports2/dpmc/CRYOSAT_OCEAN_BASELINE_D/dev/Binaries/COP_IPF2V4.27/processors/bin/IPF2_SP_COP_04_23',
        INSTALL_ROOT,
      ),
    ).toBe(
      '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF2V4.27/processors/bin/IPF2_SP_COP_04_23',
    );
  });

  it('leaves paths untouched without an install root or Binaries segment', () => {
    expect(rerootPath('/a/b/c', INSTALL_ROOT)).toBe('/a/b/c');
    expect(rerootPath('/x/Binaries/y', null)).toBe('/x/Binaries/y');
  });
});

describe('buildAcsChainPlan (SIR1LGO + IPF2_GOPM + P2P_GOP)', () => {
  const plan = buildAcsChainPlan(
    [
      { name: 'TaskTable.SIR1LGO.xml', content: SIR1LGO },
      { name: 'TaskTable.IPF2GOPM.xml', content: IPF2GOPM },
      { name: 'TaskTable.P2PGOP.xml', content: P2PGOP },
    ],
    { installRoot: INSTALL_ROOT },
  );

  it('creates one node per task table with sequenced executables', () => {
    expect(plan.nodes.map((n) => n.acronym)).toEqual([
      'SIR1LGO',
      'IPF2_GOPM',
      'P2P_GOP',
    ]);
    const l1 = plan.nodes[0];
    expect(l1.executables.map((e) => e.sequence)).toEqual([0, 1, 2, 3]);
    expect(l1.executables[0]).toMatchObject({
      scriptType: 'Binary',
      stage: 'Exe',
      name: 'ipf1-pr-lop',
      path: `${INSTALL_ROOT}/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_LOP_04_10`,
    });
  });

  it('builds the job-order taskTable config with config space files', () => {
    const l1 = plan.nodes[0];
    expect(l1.taskTable.processorName).toBe('SIR1LGO');
    expect(l1.taskTable.configFile).toBe(
      `${INSTALL_ROOT}/Binaries/COP_IPF1V4.24/processors/config_files/CS_OPER_PCONF_IPF1_20130304T000000_99999999T999999_0003.XML`,
    );
    expect(l1.taskTable.configSpaceFiles).toEqual({
      Geophysical_Constants: `${INSTALL_ROOT}/Binaries/COP_IPF1V4.24/processors/config_files/Alternate_Geophysical_Constants_3.0.xml`,
    });
    expect(l1.taskTable.tasks).toHaveLength(4);
  });

  it('derives node outputs from DB destinations (with the report)', () => {
    const acronyms = plan.nodes[0].outputs.map((o) => o.productTypeAcronym);
    expect(acronyms).toEqual(
      expect.arrayContaining(['SIR_GOPM1B', 'SIRPRODRPT']),
    );
    expect(plan.nodes[0].outputs[0].localName).toMatch(/^out\/CS_\*/);
  });

  it('infers cross-table edges with the right dependency modes', () => {
    expect(plan.edges).toEqual([
      {
        parentAcronym: 'SIR1LGO',
        childAcronym: 'IPF2_GOPM',
        dependencyMode: 'OnSuccess',
        viaTypes: ['SIR_GOPM1B'],
      },
      {
        parentAcronym: 'IPF2_GOPM',
        childAcronym: 'P2P_GOP',
        dependencyMode: 'OnCompletion',
        viaTypes: ['SIR_GOPM_2'],
      },
    ]);
  });

  it('never wires edges through the shared report type', () => {
    for (const edge of plan.edges)
      expect(edge.viaTypes).not.toContain('SIRPRODRPT');
  });

  it('flags aux inputs produced by no imported table', () => {
    expect(plan.nodes[0].externalInputTypes).toEqual(
      expect.arrayContaining(['MPL_ORBREF', 'AUX_DORUSO', 'AUX_IONGIM']),
    );
    expect(plan.nodes[0].externalInputTypes).not.toContain('SIR_GOPM1B');
  });

  it('suggests per-package images and names the chain after the sink', () => {
    expect(plan.nodes[0].suggestedImageUrl).toContain('cryosat-ocean-ipf1');
    expect(plan.nodes[1].suggestedImageUrl).toContain('cryosat-ocean-ipf2');
    expect(plan.name).toBe('P2P_GOP chain');
    expect(plan.detectedSourceRoot).toBe(
      '/exports/dpmc/scripts/specific-package/cryosat_ocean_baseline_d',
    );
  });
});
