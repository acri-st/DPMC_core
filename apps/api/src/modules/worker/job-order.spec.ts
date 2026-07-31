import {
  buildJobOrder,
  formatIpfTime,
  parseSensingFromName,
  type TaskTableConfig,
} from './job-order';

const taskTable: TaskTableConfig = {
  processorName: 'SIR1LGO',
  version: '4.24',
  configFile: '/dpmc/scripts/cryosat_ocean_baseline_d/pconf.xml',
  configSpaces: ['Geophysical_Constants'],
  configSpaceFiles: {
    Geophysical_Constants: '/dpmc/scripts/cryosat_ocean_baseline_d/geo.xml',
  },
  tasks: [
    {
      name: 'IPF1_PR_LOP',
      version: '04.10',
      inputs: [
        { fileType: 'SIR1LRM_0_', origin: 'DB', mandatory: true },
        { fileType: 'MPL_ORBREF', origin: 'DB', mandatory: true },
      ],
      outputs: [{ fileType: 'INT1LRM_L0', destination: 'PROC' }],
    },
    {
      name: 'IPF1_PP_COP',
      version: '04.10',
      inputs: [
        { fileType: 'INT1LRM_L0', origin: 'PROC', mandatory: true },
        {
          origin: 'DB',
          mandatory: true,
          alternatives: [
            { order: 0, fileType: 'AUX_DORUSO' },
            { order: 1, fileType: 'AUX_FALLBK' },
          ],
        },
      ],
      outputs: [{ fileType: 'SIR_GOPM1B', destination: 'DB' }],
    },
    {
      name: 'IPF_REPORT_GENERATOR',
      version: '02.01',
      inputs: [{ fileType: 'LOG', origin: 'LOG', mandatory: true }],
      outputs: [{ fileType: 'SIRPRODRPT', destination: 'DB' }],
    },
  ],
};

describe('parseSensingFromName', () => {
  it('extracts the sensing interval from an Earth-Explorer name', () => {
    const s = parseSensingFromName(
      'CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001',
    );
    expect(s).not.toBeNull();
    expect(formatIpfTime(s!.start!)).toBe('20220102_084024000000');
    expect(formatIpfTime(s!.stop!)).toBe('20220102_084445000000');
  });

  it('passes open-interval sentinels through instead of mangling them', () => {
    const s = parseSensingFromName(
      'CS_OPER_AUX_IPFDBA_20100701T000000_99999999T999999_0003.EEF',
    );
    expect(s?.start).not.toBeNull();
    expect(s?.stop).toBeNull();
    expect(s?.startIpf).toBe('20100701_000000000000');
    expect(s?.stopIpf).toBe('99999999_999999999999');
  });

  it('returns null when no interval is embedded', () => {
    expect(parseSensingFromName('whatever.txt')).toBeNull();
  });
});

describe('buildJobOrder', () => {
  const filesByType = new Map([
    [
      'SIR1LRM_0_',
      [
        {
          path: '/work/input/CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001',
          start: new Date(Date.UTC(2022, 0, 2, 8, 40, 24)),
          stop: new Date(Date.UTC(2022, 0, 2, 8, 44, 45)),
        },
      ],
    ],
    ['AUX_FALLBK', [{ path: '/work/input/AUX_FALLBK_FILE' }]],
  ]);

  const { xml, missingMandatory } = buildJobOrder({
    taskTable,
    filesByType,
    processingStation: 'DPMC',
    workdir: '/work',
  });

  it('renders Ipf_Conf with processor conf, config space and sensing envelope', () => {
    expect(xml).toContain('<Processor_Name>SIR1LGO</Processor_Name>');
    expect(xml).toContain(
      '<File_Name>/dpmc/scripts/cryosat_ocean_baseline_d/pconf.xml</File_Name>',
    );
    expect(xml).toContain(
      '<Geophysical_Constants>/dpmc/scripts/cryosat_ocean_baseline_d/geo.xml</Geophysical_Constants>',
    );
    expect(xml).toContain('<Start>20220102_084024000000</Start>');
    expect(xml).toContain('<Stop>20220102_084445000000</Stop>');
  });

  it('places Processor_Conf at the document root, after Ipf_Conf', () => {
    expect(xml.indexOf('<Processor_Conf>')).toBeGreaterThan(
      xml.indexOf('</Ipf_Conf>'),
    );
  });

  it('falls back to the sensing envelope for undated time intervals', () => {
    // The PROC intermediate has no dates of its own — its Time_Interval must
    // carry the sensing envelope, not the CFI-rejected sentinels.
    const proc = xml.slice(xml.indexOf('<Task_Name>IPF1_PP_COP</Task_Name>'));
    expect(proc).toContain('<Start>20220102_084024000000</Start>');
    expect(proc).not.toContain('00000000_000000000000');
  });

  it('renders one Ipf_Proc per task with resolved DB inputs', () => {
    expect(xml).toContain('<List_of_Ipf_Procs count="3">');
    expect(xml).toContain('<Task_Name>IPF1_PR_LOP</Task_Name>');
    expect(xml).toContain(
      '<File_Name>/work/input/CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001</File_Name>',
    );
  });

  it('names PROC stems as EE product names, DB outputs as the out dir', () => {
    // Matches the reference job orders + empirical behaviour of the
    // processors: intermediates are stems, final products get the out/
    // directory and name themselves inside it.
    expect(xml).toContain(
      '<File_Name>/work/CS_OPER_INT1LRM_L0_20220102T084024_20220102T084445_0001</File_Name>',
    );
    expect(xml).toContain('<File_Name_Type>Stem</File_Name_Type>');
    expect(xml).toContain('<File_Name>/work/LOG</File_Name>');
    expect(xml).toContain('<File_Name>/work/out</File_Name>');
  });

  it('renders breakpoints off and dynamic processing parameters', () => {
    expect(xml).toContain('<Breakpoint_Enable>false</Breakpoint_Enable>');
    expect(xml).toContain('<Enable>OFF</Enable>');
    const withParams = buildJobOrder({
      taskTable: {
        ...taskTable,
        dynamicProcessingParameters: { Baseline: 'D' },
      },
      filesByType,
      processingStation: 'DPMC',
      workdir: '/work',
    });
    expect(withParams.xml).toContain('<Name>Baseline</Name>');
    expect(withParams.xml).toContain('<Value>D</Value>');
  });

  it('uses the configured product-name prefix for stems', () => {
    const other = buildJobOrder({
      taskTable: { ...taskTable, productNamePrefix: 'S3_OPER' },
      filesByType,
      processingStation: 'DPMC',
      workdir: '/work',
    });
    expect(other.xml).toContain(
      '<File_Name>/work/S3_OPER_INT1LRM_L0_20220102T084024_20220102T084445_0001</File_Name>',
    );
  });

  it('picks the first ordered alternative with staged files', () => {
    expect(xml).toContain('<File_Type>AUX_FALLBK</File_Type>');
  });

  it('lists multi-file inputs in ascending sensing order', () => {
    // The ACS L2Input reader rejects lists that go backwards in time.
    const shuffled = buildJobOrder({
      taskTable,
      filesByType: new Map([
        [
          'SIR1LRM_0_',
          [
            {
              path: '/work/input/B_LATER',
              start: new Date(Date.UTC(2022, 0, 3)),
            },
            {
              path: '/work/input/A_EARLIER',
              start: new Date(Date.UTC(2022, 0, 1)),
            },
            { path: '/work/input/C_UNDATED' },
          ],
        ],
      ]),
      processingStation: 'DPMC',
      workdir: '/work',
    });
    const earlier = shuffled.xml.indexOf('A_EARLIER');
    const later = shuffled.xml.indexOf('B_LATER');
    const undated = shuffled.xml.indexOf('C_UNDATED');
    expect(earlier).toBeGreaterThan(-1);
    expect(earlier).toBeLessThan(later);
    expect(later).toBeLessThan(undated);
  });

  it('reports mandatory DB inputs with no staged Product', () => {
    expect(missingMandatory).toEqual(['IPF1_PR_LOP:MPL_ORBREF']);
  });

  it('omits fileless inputs instead of rendering empty lists', () => {
    // The embedded ACS reader aborts on List_of_File_Names count="0" —
    // even for optional types (P2P_GOP's per-mode L2 inputs).
    expect(xml).not.toContain('<File_Type>MPL_ORBREF</File_Type>');
    expect(xml).not.toContain('<List_of_File_Names count="0">');
  });

  it('uses open-interval sentinels when no dates are known', () => {
    const empty = buildJobOrder({
      taskTable,
      filesByType: new Map(),
      processingStation: 'DPMC',
      workdir: '/work',
    });
    expect(empty.xml).toContain('<Start>00000000_000000000000</Start>');
    expect(empty.xml).toContain('<Stop>99999999_999999999999</Stop>');
  });
});
