import { mergeParametersIn } from './parameters.utils';

describe('mergeParametersIn', () => {
  it('applies precedence: defaults < chainCfg < taskParams < parentParams', () => {
    const out = mergeParametersIn({
      defaults: { a: 1, b: 1, c: 1, d: 1 },
      chainCfg: { b: 2, c: 2, d: 2 },
      taskParams: { c: 3, d: 3 },
      parentParams: { d: 4 },
    });
    expect(out).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });
  it('handles undefined sources', () => {
    expect(mergeParametersIn({})).toEqual({});
    expect(mergeParametersIn({ defaults: { x: 1 } })).toEqual({ x: 1 });
  });
});
