/**
 * OData v4 query parser.
 *
 * Converts an OData v4 query string (the system query options
 * `$select`, `$expand`, `$top`, `$skip`, `$orderby`, `$filter`, `$count`)
 * into a set of Prisma options that can be passed directly to
 * `findMany` / `count`.
 *
 * Hand-rolled to avoid depending on an aging third-party parser. We only
 * support the subset of OData v4 that the spec calls out for ESA
 * compliance:
 *
 *   <field> eq|ne|gt|lt|ge|le <value>
 *   contains(<field>, '<value>')
 *   startswith(<field>, '<value>')
 *   endswith(<field>, '<value>')
 *   <expr> and|or <expr>
 *   ( <expr> )
 *
 * Values may be: 'string' (single-quoted, with '' escape for literal '),
 * integer (123), float (123.45), boolean (true/false), null.
 *
 * Field references that are not present in the resource's
 * `selectableFields` whitelist are rejected at the security layer to
 * stop tenants probing arbitrary columns.
 */

import { BadRequestException } from '@nestjs/common';

import type { ODataResource } from './resource-registry';

export type PrismaQuery = {
  where?: Record<string, unknown>;
  select?: Record<string, true>;
  include?: Record<string, true>;
  orderBy?: Record<string, 'asc' | 'desc'>[];
  skip?: number;
  take?: number;
};

const MAX_TOP = 1000;

export function parseODataQuery(
  qs: Record<string, string | string[] | undefined>,
  resource: ODataResource,
): PrismaQuery {
  const out: PrismaQuery = {};

  const selectRaw = pickString(qs.$select);
  if (selectRaw) {
    const fields = selectRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const selected = fields.filter((f) =>
      resource.selectableFields.includes(f),
    );
    if (selected.length === 0) {
      throw new BadRequestException(
        `$select did not match any selectable field for resource '${resource.name}'`,
      );
    }
    out.select = Object.fromEntries(selected.map((f) => [f, true as const]));
  }

  const expandRaw = pickString(qs.$expand);
  if (expandRaw) {
    const relations = expandRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowed = relations.filter((r) =>
      resource.expandableRelations.includes(r),
    );
    if (allowed.length === 0) {
      throw new BadRequestException(
        `$expand did not match any expandable relation for resource '${resource.name}'`,
      );
    }
    out.include = Object.fromEntries(allowed.map((r) => [r, true as const]));
  }

  const topRaw = pickString(qs.$top);
  if (topRaw !== undefined) {
    const n = parseInt(topRaw, 10);
    if (Number.isNaN(n) || n < 0) {
      throw new BadRequestException('$top must be a non-negative integer');
    }
    out.take = Math.min(n, MAX_TOP);
  }

  const skipRaw = pickString(qs.$skip);
  if (skipRaw !== undefined) {
    const n = parseInt(skipRaw, 10);
    if (Number.isNaN(n) || n < 0) {
      throw new BadRequestException('$skip must be a non-negative integer');
    }
    out.skip = n;
  }

  const orderByRaw = pickString(qs.$orderby);
  if (orderByRaw) {
    out.orderBy = orderByRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((part) => {
        const [field, dir] = part.split(/\s+/);
        if (!field || !resource.selectableFields.includes(field)) {
          throw new BadRequestException(
            `$orderby field '${field}' is not orderable on resource '${resource.name}'`,
          );
        }
        const direction =
          dir?.toLowerCase() === 'desc' ? ('desc' as const) : ('asc' as const);
        return { [field]: direction };
      });
  }

  const filterRaw = pickString(qs.$filter);
  if (filterRaw) {
    out.where = parseFilter(filterRaw, resource);
  }

  return out;
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

// ---------------------------------------------------------------------------
// $filter parser (recursive descent over a small grammar)
// ---------------------------------------------------------------------------

type Token =
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }
  | { kind: 'ident'; value: string }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma' });
      i += 1;
      continue;
    }
    if (ch === "'") {
      // Single-quoted string. OData escapes a literal quote by doubling it.
      let j = i + 1;
      let out = '';
      while (j < expr.length) {
        if (expr[j] === "'") {
          if (expr[j + 1] === "'") {
            out += "'";
            j += 2;
            continue;
          }
          break;
        }
        out += expr[j];
        j += 1;
      }
      if (j >= expr.length) {
        throw new BadRequestException(
          `Unterminated string literal in $filter at position ${i}`,
        );
      }
      tokens.push({ kind: 'string', value: out });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(expr[i + 1] ?? ''))) {
      let j = i + (ch === '-' ? 1 : 0);
      let hasDot = false;
      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        if (expr[j] === '.') {
          if (hasDot) break;
          hasDot = true;
        }
        j += 1;
      }
      const raw = expr.slice(i, j);
      const value = hasDot ? parseFloat(raw) : parseInt(raw, 10);
      if (Number.isNaN(value)) {
        throw new BadRequestException(
          `Invalid number literal '${raw}' in $filter`,
        );
      }
      tokens.push({ kind: 'number', value });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j += 1;
      const word = expr.slice(i, j);
      if (word === 'true') tokens.push({ kind: 'bool', value: true });
      else if (word === 'false') tokens.push({ kind: 'bool', value: false });
      else if (word === 'null') tokens.push({ kind: 'null' });
      else tokens.push({ kind: 'ident', value: word });
      i = j;
      continue;
    }
    throw new BadRequestException(
      `Unexpected character '${ch}' at position ${i} in $filter`,
    );
  }
  return tokens;
}

const COMPARISON_OPS = new Set(['eq', 'ne', 'gt', 'lt', 'ge', 'le'] as const);
type CmpOp = 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le';
const STRING_FNS = new Set(['contains', 'startswith', 'endswith'] as const);
type StringFn = 'contains' | 'startswith' | 'endswith';

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly resource: ODataResource,
  ) {}

  parse(): Record<string, unknown> {
    const expr = this.parseOr();
    if (this.pos !== this.tokens.length) {
      const tok = this.tokens[this.pos];
      throw new BadRequestException(
        `Unexpected trailing token in $filter: ${describe(tok)}`,
      );
    }
    return expr;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    if (!tok) {
      throw new BadRequestException('Unexpected end of $filter');
    }
    this.pos += 1;
    return tok;
  }

  private isIdent(value: string): boolean {
    const tok = this.peek();
    return !!tok && tok.kind === 'ident' && tok.value === value;
  }

  private parseOr(): Record<string, unknown> {
    let left = this.parseAnd();
    while (this.isIdent('or')) {
      this.consume();
      const right = this.parseAnd();
      left = { OR: [left, right] };
    }
    return left;
  }

  private parseAnd(): Record<string, unknown> {
    let left = this.parsePrimary();
    while (this.isIdent('and')) {
      this.consume();
      const right = this.parsePrimary();
      left = { AND: [left, right] };
    }
    return left;
  }

  private parsePrimary(): Record<string, unknown> {
    const tok = this.peek();
    if (!tok) {
      throw new BadRequestException('Unexpected end of $filter');
    }
    if (tok.kind === 'lparen') {
      this.consume();
      const inner = this.parseOr();
      const close = this.consume();
      if (close.kind !== 'rparen') {
        throw new BadRequestException(
          `Expected ')' in $filter, got ${describe(close)}`,
        );
      }
      return inner;
    }
    if (tok.kind === 'ident') {
      // Function form: contains(field, 'value')
      const next = this.tokens[this.pos + 1];
      if (next?.kind === 'lparen' && STRING_FNS.has(tok.value as StringFn)) {
        return this.parseStringFn();
      }
      return this.parseComparison();
    }
    throw new BadRequestException(
      `Unexpected token in $filter: ${describe(tok)}`,
    );
  }

  private parseStringFn(): Record<string, unknown> {
    const fnTok = this.consume();
    if (fnTok.kind !== 'ident') {
      throw new BadRequestException('Expected function name');
    }
    const fn = fnTok.value as StringFn;
    const lparen = this.consume();
    if (lparen.kind !== 'lparen') {
      throw new BadRequestException(`Expected '(' after ${fn}`);
    }
    const fieldTok = this.consume();
    if (fieldTok.kind !== 'ident') {
      throw new BadRequestException(
        `Expected field name as first argument to ${fn}`,
      );
    }
    const comma = this.consume();
    if (comma.kind !== 'comma') {
      throw new BadRequestException(`Expected ',' in ${fn} call`);
    }
    const valueTok = this.consume();
    if (valueTok.kind !== 'string') {
      throw new BadRequestException(
        `Expected string literal as second argument to ${fn}`,
      );
    }
    const close = this.consume();
    if (close.kind !== 'rparen') {
      throw new BadRequestException(`Expected ')' to close ${fn} call`);
    }
    this.assertField(fieldTok.value);
    const op =
      fn === 'contains'
        ? 'contains'
        : fn === 'startswith'
          ? 'startsWith'
          : 'endsWith';
    return { [fieldTok.value]: { [op]: valueTok.value } };
  }

  private parseComparison(): Record<string, unknown> {
    const fieldTok = this.consume();
    if (fieldTok.kind !== 'ident') {
      throw new BadRequestException('Expected field name in comparison');
    }
    this.assertField(fieldTok.value);
    const opTok = this.consume();
    if (opTok.kind !== 'ident' || !COMPARISON_OPS.has(opTok.value as CmpOp)) {
      throw new BadRequestException(
        `Expected comparison operator after '${fieldTok.value}', got ${describe(opTok)}`,
      );
    }
    const valueTok = this.consume();
    const value = literalValue(valueTok);
    return cmp(fieldTok.value, opTok.value as CmpOp, value);
  }

  private assertField(name: string): void {
    if (!this.resource.selectableFields.includes(name)) {
      throw new BadRequestException(
        `Field '${name}' is not filterable on resource '${this.resource.name}'`,
      );
    }
  }
}

function literalValue(tok: Token): unknown {
  if (tok.kind === 'string') return tok.value;
  if (tok.kind === 'number') return tok.value;
  if (tok.kind === 'bool') return tok.value;
  if (tok.kind === 'null') return null;
  throw new BadRequestException(
    `Expected literal value in $filter, got ${describe(tok)}`,
  );
}

function cmp(
  field: string,
  op: CmpOp,
  value: unknown,
): Record<string, unknown> {
  switch (op) {
    case 'eq':
      return { [field]: { equals: value } };
    case 'ne':
      return { [field]: { not: value } };
    case 'gt':
      return { [field]: { gt: value } };
    case 'lt':
      return { [field]: { lt: value } };
    case 'ge':
      return { [field]: { gte: value } };
    case 'le':
      return { [field]: { lte: value } };
  }
}

function describe(tok: Token | undefined): string {
  if (!tok) return 'end-of-input';
  switch (tok.kind) {
    case 'lparen':
      return "'('";
    case 'rparen':
      return "')'";
    case 'comma':
      return "','";
    case 'ident':
      return `identifier '${tok.value}'`;
    case 'string':
      return `string '${tok.value}'`;
    case 'number':
      return `number ${tok.value}`;
    case 'bool':
      return `boolean ${tok.value}`;
    case 'null':
      return 'null';
  }
}

export function parseFilter(
  expr: string,
  resource: ODataResource,
): Record<string, unknown> {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return {};
  const parser = new Parser(tokens, resource);
  return parser.parse();
}
