import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG } from '../constants/config';

const LOG_DIR = CONFIG.paths.logDir;

// Disable colors when: NO_COLOR is set, TERM=dumb, or not a TTY (e.g. Jest capturing output).
// FORCE_COLOR overrides all of the above.
const USE_COLOR = process.env.FORCE_COLOR === '1'
  ? true
  : process.env.NO_COLOR || process.env.TERM === 'dumb' || !process.stderr.isTTY
    ? false
    : true;

const c = USE_COLOR
  ? {
      reset:  '\x1b[0m',
      grey:   '\x1b[90m',
      cyan:   '\x1b[36m',
      green:  '\x1b[32m',
      red:    '\x1b[31m',
      yellow: '\x1b[33m',
      bold:   '\x1b[1m',
    }
  : { reset: '', grey: '', cyan: '', green: '', red: '', yellow: '', bold: '' };

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function toFile(logFile: string, line: string) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(resolve(LOG_DIR, logFile), line + '\n', 'utf8');
  } catch { /* best-effort */ }
}

// Write to stderr — never corrupts Jest's --json stdout stream.
function print(line: string) {
  process.stderr.write(line + '\n');
}

function detailStr(detail: unknown): string {
  if (detail === undefined) return '';
  const json = typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2);
  return '\n    ' + json.replace(/\n/g, '\n    ');
}

export function makeLogger(suite: string, logFile = `${suite.toLowerCase().replace(/[^a-z0-9]/g, '-')}.log`) {
  function fmt(sym: string, symColor: string, label: string, detail?: unknown) {
    const d = detailStr(detail);
    const colored = `${c.grey}${ts()}${c.reset} ${symColor}${sym}${c.reset} ${c.bold}[${suite}]${c.reset} ${label}${c.grey}${d}${c.reset}`;
    const plain   = `${ts()} ${sym} [${suite}] ${label}${d}`;
    print(colored);
    toFile(logFile, plain);
  }

  return {
    step(label: string) {
      fmt('STEP', c.cyan, label);
    },
    action(msg: string, detail?: unknown) {
      fmt('  ->', c.grey, msg, detail);
    },
    ok(msg: string, detail?: unknown) {
      fmt('  OK', c.green, msg, detail);
    },
    fail(msg: string, detail?: unknown) {
      fmt('FAIL', c.red, msg, detail);
    },
    warn(msg: string, detail?: unknown) {
      fmt('WARN', c.yellow, msg, detail);
    },
    assert(label: string, expected: unknown, actual: unknown) {
      const pass = JSON.stringify(expected) === JSON.stringify(actual);
      if (pass) {
        fmt('  OK', c.green, label, actual);
      } else {
        fmt('FAIL', c.red, `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    http(method: string, path: string, status: number, body?: unknown) {
      const col = status < 300 ? c.green : status < 400 ? c.yellow : c.red;
      fmt('  =>', col, `${method} ${path} -> ${status}`, body);
    },
  };
}
