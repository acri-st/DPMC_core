import { z } from 'zod';
import { enumArrayQueryParam } from './pagination';

const Status = z.enum(['A', 'B', 'C']);
const schema = z.object({ status: enumArrayQueryParam(Status) });

describe('enumArrayQueryParam', () => {
  it('parses repeated params (array input)', () => {
    expect(schema.parse({ status: ['A', 'B'] })).toEqual({
      status: ['A', 'B'],
    });
  });

  it('parses a single comma-joined param', () => {
    expect(schema.parse({ status: 'A,C' })).toEqual({ status: ['A', 'C'] });
  });

  it('parses a single bare value', () => {
    expect(schema.parse({ status: 'B' })).toEqual({ status: ['B'] });
  });

  it('is optional (undefined stays undefined)', () => {
    expect(schema.parse({})).toEqual({});
  });

  it('rejects values outside the enum', () => {
    expect(() => schema.parse({ status: 'A,Z' })).toThrow();
  });
});
