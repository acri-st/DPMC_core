import { ScriptType } from '@dpmc/prisma';
import { buildExecutableChain, parseStaticVolumes } from './worker.service';

describe('parseStaticVolumes', () => {
  it('parses name=path pairs and ignores malformed entries', () => {
    const map = parseStaticVolumes(
      'cryosat-sad=/srv/sad, other=/data/x ,broken,=/nope',
    );
    expect(map.get('cryosat-sad')).toBe('/srv/sad');
    expect(map.get('other')).toBe('/data/x');
    expect(map.size).toBe(2);
  });

  it('returns an empty map for an empty value', () => {
    expect(parseStaticVolumes('').size).toBe(0);
  });
});

describe('buildExecutableChain', () => {
  it('chains executables in order with && and a leading cd /work', () => {
    const chain = buildExecutableChain([
      {
        scriptType: ScriptType.Binary,
        path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_LOP_04_10',
        args: null,
      },
      {
        scriptType: ScriptType.Binary,
        path: '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_SP_COP_04_20',
        args: null,
      },
    ]);
    expect(chain).toBe(
      'cd /work && ' +
        '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_PR_LOP_04_10 && ' +
        '/dpmc/scripts/cryosat_ocean_baseline_d/Binaries/COP_IPF1V4.24/processors/bin/IPF1_SP_COP_04_20',
    );
  });

  it('prefixes interpreters and splits args into tokens', () => {
    const chain = buildExecutableChain([
      {
        scriptType: ScriptType.Python,
        path: '/dpmc/scripts/a.py',
        args: '--x 1',
      },
      { scriptType: ScriptType.Bash, path: '/dpmc/scripts/b.sh', args: null },
    ]);
    expect(chain).toBe(
      'cd /work && python /dpmc/scripts/a.py --x 1 && bash /dpmc/scripts/b.sh',
    );
  });

  it('shell-quotes tokens containing special characters', () => {
    const chain = buildExecutableChain([
      {
        scriptType: ScriptType.Binary,
        path: '/dpmc/scripts/run me',
        args: "--label it's",
      },
    ]);
    expect(chain).toBe("cd /work && '/dpmc/scripts/run me' --label 'it'\\''s'");
  });
});
