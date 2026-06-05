import type { CanonicalIR } from '../canonical-ir';

export interface TtAdapter {
  readonly name: string;
  parse(content: string): CanonicalIR;
}

export class TtParseError extends Error {}
