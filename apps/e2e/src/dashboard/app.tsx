import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import { buildCoverageState } from './domain/state';
import type { RunArtifact, TestDefinitionEntry } from './domain/types';
import { buildRunRequestBody } from './domain/run-request';
import type { RunScope } from './domain/commands';
import {
  getResolvedTheme,
  getStoredTheme,
  getThemeStorageKey,
  type ThemePreference,
} from './domain/theme';

// ─── Environment types (mirrors env-manager.ts) ───────────────────────────────

type ComponentStatus = 'stopped' | 'starting' | 'up' | 'stopping' | 'error';
type EnvStatus = 'idle' | 'starting' | 'up' | 'stopping' | 'error';

interface ComponentState {
  name: string;
  status: ComponentStatus;
  error?: string;
}

interface EnvState {
  status: EnvStatus;
  components: ComponentState[];
  error?: string;
}

// ─── Env panel ────────────────────────────────────────────────────────────────

const COMPONENT_LABELS: Record<string, string> = {
  docker: 'Docker',
  keycloak: 'Keycloak',
  database: 'Database',
  api: 'API',
  dispatcher: 'Dispatcher',
  worker: 'Worker',
};

function componentDot(status: ComponentStatus) {
  if (status === 'up')       return 'bg-emerald-500';
  if (status === 'error')    return 'bg-red-500';
  if (status === 'starting' || status === 'stopping') return 'bg-amber-400 animate-pulse';
  return 'bg-neutral-400 dark:bg-neutral-600';
}

function envBadgeClass(status: EnvStatus) {
  if (status === 'up')      return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'error')   return 'text-red-600 dark:text-red-400';
  if (status === 'starting' || status === 'stopping') return 'text-amber-500 dark:text-amber-400';
  return 'text-neutral-500 dark:text-neutral-400';
}

function EnvPanel({ env, onRestart }: { env: EnvState | null; onRestart: () => void }) {
  const B = 'border-neutral-200 dark:border-neutral-800';
  const TM = 'text-neutral-500 dark:text-neutral-400';

  if (!env) {
    return (
      <div className={`flex shrink-0 items-center gap-3 border-b ${B} bg-neutral-50 dark:bg-neutral-900 px-5 py-2 text-xs ${TM}`}>
        Loading environment…
      </div>
    );
  }

  const statusLabel = env.status === 'idle' ? 'idle' : env.status;

  return (
    <div className={`flex shrink-0 items-center gap-4 border-b ${B} bg-neutral-50 dark:bg-neutral-900/60 px-5 py-2`}>
      <span className={`text-[11px] font-bold uppercase tracking-widest ${TM}`}>Env</span>
      <span className={`text-xs font-semibold ${envBadgeClass(env.status)}`}>{statusLabel}</span>

      <div className="flex items-center gap-3">
        {env.components.map((c) => (
          <div key={c.name} className="flex items-center gap-1.5" title={c.error ?? c.status}>
            <span className={`inline-block size-2 rounded-full ${componentDot(c.status)}`} />
            <span className={`text-xs ${c.status === 'error' ? 'text-red-600 dark:text-red-400' : c.status === 'up' ? 'text-neutral-700 dark:text-neutral-300' : TM}`}>
              {COMPONENT_LABELS[c.name] ?? c.name}
            </span>
          </div>
        ))}
      </div>

      {(env.status === 'error' || env.status === 'idle') && (
        <button
          type="button"
          onClick={onRestart}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          Restart env
        </button>
      )}

      {env.error && env.status === 'error' && (
        <span className="ml-2 max-w-xs truncate text-xs text-red-500" title={env.error}>{env.error}</span>
      )}
    </div>
  );
}

type SnapshotResponse = {
  catalog: TestDefinitionEntry[];
  requirements: Array<{ id: string; label: string; tests: string[] }>;
  lastRun: RunArtifact | null;
  running: boolean;
};

// ─── Colored log ─────────────────────────────────────────────────────────────

type LineStyle = { color: string; bold?: boolean };

function classifyLine(line: string): LineStyle {
  const t = line.trimStart();
  // Jest PASS / FAIL file lines (e.g. "PASS src/tests/t11/t11.1.e2e-spec.ts")
  if (/^PASS\s/.test(t))
    return { color: 'text-emerald-500 dark:text-emerald-400', bold: true };
  if (/^FAIL\s/.test(t))
    return { color: 'text-red-500 dark:text-red-400', bold: true };
  // Individual test result lines  ✓ / ✗ / ○
  if (/^\s*✓/.test(line) || /^\s*√/.test(line))
    return { color: 'text-emerald-500 dark:text-emerald-400' };
  if (/^\s*✕/.test(line) || /^\s*×/.test(line))
    return { color: 'text-red-500 dark:text-red-400' };
  if (/^\s*○/.test(line))
    return { color: 'text-amber-500 dark:text-amber-400' };
  // Failure detail headers ("● describe › test name")
  if (/^●/.test(t))
    return { color: 'text-red-500 dark:text-red-400', bold: true };
  // Jest summary line ("Tests: X passed, Y failed, Z total")
  if (/^Tests:/.test(t) || /^Test Suites:/.test(t) || /^Snapshots:/.test(t) || /^Time:/.test(t))
    return { color: 'text-neutral-500 dark:text-neutral-400', bold: true };
  // "Ran X test suites" or "Ran all test suites"
  if (/^Ran all test suites/.test(t) || /^Ran \d+/.test(t))
    return { color: 'text-neutral-400 dark:text-neutral-500' };
  // Step headers [T11.1] Step …
  if (/^\[T\d+\.\d+\] Step/.test(t))
    return { color: 'text-sky-500 dark:text-sky-400', bold: true };
  // Describe / suite names (indented lines inside PASS/FAIL blocks)
  if (/^\s{2,}\w/.test(line) && !/^\s{2,}(at |expect|Error)/.test(line))
    return { color: 'text-violet-500 dark:text-violet-400' };
  // Error stack frames
  if (/^\s*at /.test(t))
    return { color: 'text-neutral-400 dark:text-neutral-500' };
  // Separator lines
  if (/^─+$/.test(t) || /^═+$/.test(t))
    return { color: 'text-neutral-400 dark:text-neutral-500' };
  return { color: '' };
}

function ColoredLog({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const { color, bold } = classifyLine(line);
        return (
          <span key={i} className={`${color}${bold ? ' font-bold' : ''}`}>
            {line}
            {'\n'}
          </span>
        );
      })}
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPlay({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 2.5 13 8 3 13.5z" />
    </svg>
  );
}

function IconSpinner({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={`animate-spin ${className}`}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function IconSun({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconMoon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconMonitor({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function IconBeaker({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M9 3h6M5 21h14a2 2 0 0 0 1.84-2.75L15 9V3H9v6L3.16 18.25A2 2 0 0 0 5 21z" />
      <line x1="5.5" y1="14" x2="18.5" y2="14" />
    </svg>
  );
}

function IconShield({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconActivity({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconTerminal({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconCheck({ className = 'size-2.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconXMark({ className = 'size-2.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSkipForward({ className = 'size-2.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function IconMinus({ className = 'size-2.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconChevron({ open, className = 'size-3.5' }: { open: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`transition-transform duration-150 ${open ? 'rotate-90' : ''} ${className}`}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconBarChart2({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  );
}

function IconList({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <line x1="8" y1="6"  x2="21" y2="6"  />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6"  x2="3.01" y2="6"  strokeWidth="2.5" />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2.5" />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2.5" />
    </svg>
  );
}

function IconLayers({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconAlertCircle({ className = 'size-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const B = 'border-neutral-200 dark:border-neutral-800';
const DX = 'divide-x divide-neutral-200 dark:divide-neutral-800';
const DY = 'divide-y divide-neutral-200 dark:divide-neutral-800';
const T = 'text-neutral-900 dark:text-neutral-50';
const TM = 'text-neutral-500 dark:text-neutral-400';
const TP = 'text-blue-600 dark:text-blue-400';
const SURF = 'bg-neutral-50 dark:bg-neutral-900';
const HOVER = 'hover:bg-neutral-50 dark:hover:bg-neutral-900';

const btnBase =
  'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:pointer-events-none disabled:opacity-50';
const btnSec = `${btnBase} border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 ${T} hover:bg-neutral-200 dark:hover:bg-neutral-700`;
const btnPri = `${btnBase} border-transparent bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400`;

const chipBase = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4';
const chipNeutral = `${chipBase} bg-neutral-100 dark:bg-neutral-800 ${TM}`;
const chipStatus = {
  passed:  `${chipBase} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400`,
  failed:  `${chipBase} bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400`,
  skipped: `${chipBase} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400`,
  missing: `${chipBase} bg-neutral-100 dark:bg-neutral-800 ${TM}`,
};

const statusIcon = {
  passed:  <IconCheck />,
  failed:  <IconXMark />,
  skipped: <IconSkipForward />,
  missing: <IconMinus />,
};

// ─── Coverage chart ───────────────────────────────────────────────────────────

import type { RequirementCoverage } from './domain/coverage';

interface BarEntry {
  label: string;       // x-axis label
  passed: number;      // raw count or aggregated %
  failed: number;
  skipped: number;
  missing: number;
  total: number;       // sum of all, used for tooltip
  groupLabel?: string; // section break above this bar
}

const SERIES = [
  { key: 'passed',  color: { light: '#10b981', dark: '#34d399' } },
  { key: 'failed',  color: { light: '#ef4444', dark: '#f87171' } },
  { key: 'skipped', color: { light: '#f59e0b', dark: '#fbbf24' } },
  { key: 'missing', color: { light: '#d4d4d4', dark: '#404040' } },
] as const;

function CoverageChart({
  groups,
  isDark,
  mode,
}: {
  groups: Map<string, RequirementCoverage[]>;
  isDark: boolean;
  mode: 'chart' | 'eocp';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: BarEntry } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // ── Build bar entries ────────────────────────────────────────────────────────
  const entries = useMemo<BarEntry[]>(() => {
    if (mode === 'eocp') {
      return [...groups.entries()].flatMap(([family, items]) => {
        if (!items.length) return [];
        const n = items.length;
        const passed  = items.reduce((s, i) => s + i.passed,  0) / n;
        const failed  = items.reduce((s, i) => s + i.failed,  0) / n;
        const skipped = items.reduce((s, i) => s + i.skipped, 0) / n;
        const missing = items.reduce((s, i) => s + i.missing, 0) / n;
        return [{ label: `EOCP-${family}`, passed, failed, skipped, missing, total: n }];
      });
    }
    return [...groups.entries()].flatMap(([family, items]) =>
      items.map((item, i) => ({
        label:    item.id,
        passed:   item.passed,
        failed:   item.failed,
        skipped:  item.skipped,
        missing:  item.missing,
        total:    item.tests.length,
        groupLabel: i === 0 ? `EOCP-${family}` : undefined,
      }))
    );
  }, [groups, mode]);

  if (!entries.length) return null;

  // ── Layout ───────────────────────────────────────────────────────────────────
  const LABEL_W  = 76;   // left column for row labels
  const PAD_R    = 36;   // right padding (leaves room for "100%" tick label)
  const PAD_T    = 0;
  const PAD_B    = 24;   // bottom: X-axis ticks
  const SLOT_H   = 18;   // height per bar row
  const GRP_H    = 16;   // height of a group-header row
  const BAR_H    = 10;   // actual bar thickness
  const BAR_OFF  = (SLOT_H - BAR_H) / 2;

  const groupBreaks = entries.filter(e => e.groupLabel !== undefined).length;
  const plotH   = entries.length * SLOT_H + (mode === 'chart' ? groupBreaks * GRP_H : 0);
  const totalH  = PAD_T + plotH + PAD_B;
  const plotW   = width - LABEL_W - PAD_R;

  const X_TICKS = [0, 25, 50, 75, 100];
  const scaleX  = (v: number) => LABEL_W + (v / 100) * plotW;

  const C = {
    axis:      isDark ? '#525252' : '#d4d4d4',
    grid:      isDark ? '#262626' : '#f5f5f5',
    tick:      isDark ? '#737373' : '#a3a3a3',
    label:     isDark ? '#a3a3a3' : '#525252',
    groupBg:   isDark ? '#171717' : '#f9fafb',
    groupFg:   isDark ? '#737373' : '#a3a3a3',
    groupLn:   isDark ? '#3f3f3f' : '#e5e7eb',
    tooltipBg: isDark ? '#1c1c1c' : '#ffffff',
    tooltipBd: isDark ? '#3f3f3f' : '#e5e7eb',
    tooltipFg: isDark ? '#e5e5e5' : '#171717',
  };

  // ── Grid (vertical lines) ────────────────────────────────────────────────────
  const gridEls = X_TICKS.map(t => (
    <g key={t}>
      <line
        x1={scaleX(t)} y1={PAD_T}
        x2={scaleX(t)} y2={PAD_T + plotH}
        stroke={t === 0 ? C.axis : C.grid}
        strokeWidth={t === 0 ? 1 : 0.5}
      />
      <text
        x={scaleX(t)} y={PAD_T + plotH + 12}
        fontSize={10} textAnchor="middle" fill={C.tick}
        style={{ fontFamily: 'inherit' }}
      >{t}%</text>
    </g>
  ));

  // ── Bars + labels ────────────────────────────────────────────────────────────
  const rowEls: React.ReactNode[] = [];
  let rowY = PAD_T;

  entries.forEach((entry, i) => {
    // Group header row
    if (entry.groupLabel) {
      rowEls.push(
        <g key={`gh-${i}`}>
          <rect x={0} y={rowY} width={width} height={GRP_H} fill={C.groupBg} />
          <line x1={0} y1={rowY} x2={width} y2={rowY} stroke={C.groupLn} strokeWidth={0.5} />
          <text
            x={6} y={rowY + GRP_H / 2 + 3.5}
            fontSize={10} fontWeight="700" fill={C.groupFg}
            style={{ fontFamily: 'inherit', textTransform: 'uppercase' }}
          >{entry.groupLabel}</text>
        </g>
      );
      rowY += GRP_H;
    }

    const barY = rowY + BAR_OFF;

    // Row label (left)
    rowEls.push(
      <text key={`lbl-${i}`}
        x={LABEL_W - 5} y={rowY + SLOT_H / 2 + 3.5}
        fontSize={10} fontWeight="500" textAnchor="end" fill={C.label}
        style={{ fontFamily: 'inherit' }}
      >{entry.label}</text>
    );

    // Stacked bar segments
    let barX = LABEL_W;
    for (const s of SERIES) {
      const val = entry[s.key];
      if (val <= 0) continue;
      const segW = (val / 100) * plotW;
      rowEls.push(
        <rect key={`${i}-${s.key}`}
          x={barX} y={barY} width={segW} height={BAR_H}
          fill={isDark ? s.color.dark : s.color.light}
          rx={1.5}
          onMouseEnter={(e) => {
            const svgRect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
            setTooltip({ x: e.clientX - svgRect.left, y: e.clientY - svgRect.top, entry });
          }}
          onMouseLeave={() => setTooltip(null)}
          style={{ cursor: 'default' }}
        />
      );
      barX += segW;
    }

    // Inline passed-% label if bar is wide enough
    const passedW = (entry.passed / 100) * plotW;
    if (passedW > 22) {
      rowEls.push(
        <text key={`pct-${i}`}
          x={LABEL_W + passedW - 3} y={barY + BAR_H - 2}
          fontSize={7} fontWeight="600" textAnchor="end"
          fill={isDark ? '#064e3b' : '#fff'}
          style={{ fontFamily: 'inherit', pointerEvents: 'none' }}
        >{entry.passed.toFixed(0)}%</text>
      );
    }

    rowY += SLOT_H;
  });

  // ── Tooltip ───────────────────────────────────────────────────────────────────
  const TT_W = 134;
  const TT_H = 76;
  const tooltipEl = tooltip ? (() => {
    const tx = tooltip.x + 12 + TT_W > width ? tooltip.x - TT_W - 6 : tooltip.x + 12;
    const ty = Math.max(2, Math.min(tooltip.y - TT_H / 2, totalH - TT_H - 2));
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={tx} y={ty} width={TT_W} height={TT_H} rx={5}
          fill={C.tooltipBg} stroke={C.tooltipBd} strokeWidth={1}
          filter="drop-shadow(0 2px 6px rgba(0,0,0,.18))"
        />
        <text x={tx + 8} y={ty + 13} fontSize={9} fontWeight="700" fill={C.tooltipFg} style={{ fontFamily: 'inherit' }}>
          {tooltip.entry.label}
        </text>
        {SERIES.map((s, si) => (
          <g key={s.key}>
            <rect x={tx + 8}  y={ty + 20 + si * 13} width={7} height={7} rx={1.5}
              fill={isDark ? s.color.dark : s.color.light} />
            <text x={tx + 19} y={ty + 27 + si * 13} fontSize={9.5} fill={C.tooltipFg} style={{ fontFamily: 'inherit' }}>
              {s.key}: {tooltip.entry[s.key].toFixed(0)}%
            </text>
          </g>
        ))}
      </g>
    );
  })() : null;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width={width} height={totalH}
        aria-label="Coverage bar chart"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {gridEls}
        {rowEls}
        {tooltipEl}
      </svg>
    </div>
  );
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

// Extract "E1" from "EOCP-E1-01" or "EOCP-E1"
function reqFamily(reqId: string): string {
  const m = reqId.match(/EOCP-(E\d+)/i);
  return m ? m[1].toUpperCase() : 'OTHER';
}

// Extract "E1" from test id "t01-3" → E1, "t02-1" → E2, etc.
function testFamily(testId: string): string {
  const m = testId.match(/^t0*(\d+)/i);
  if (!m) return 'OTHER';
  const n = parseInt(m[1], 10);
  return `E${n}`;
}

// Collect all family keys present in a list, sorted
function allFamilies(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10);
    const nb = parseInt(b.replace(/\D/g, ''), 10);
    return na - nb;
  });
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function getSnapshot(): Promise<SnapshotResponse> {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error(`State request failed: ${res.status}`);
  return res.json();
}

async function postRun(scope: RunScope) {
  return fetch('/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildRunRequestBody(scope)),
  });
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const chipFilter = (active: boolean) =>
  `${chipBase} cursor-pointer select-none border transition-colors ` +
  (active
    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500'
    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500');

function FilterBar({
  families,
  active,
  onToggle,
  onClear,
}: {
  families: string[];
  active: Set<string>;
  onToggle: (f: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-4 py-2">
      {families.map((f) => (
        <button
          key={f}
          type="button"
          className={chipFilter(active.has(f))}
          onClick={() => onToggle(f)}
          aria-pressed={active.has(f)}
        >
          EOCP-{f}
        </button>
      ))}
      {active.size > 0 && (
        <button
          type="button"
          className={`${chipBase} cursor-pointer border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300`}
          onClick={onClear}
        >
          clear
        </button>
      )}
    </div>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({
  family,
  count,
  open,
  onToggle,
  selectionState,
  onSelectGroup,
}: {
  family: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  selectionState?: 'none' | 'some' | 'all';
  onSelectGroup?: () => void;
}) {
  return (
    <div className={`flex w-full items-center gap-2 px-4 py-1.5 transition-colors ${SURF} hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-b ${B}`}>
      {onSelectGroup && (
        <input
          type="checkbox"
          className="size-3.5 shrink-0 accent-blue-600"
          checked={selectionState === 'all'}
          ref={(el) => { if (el) el.indeterminate = selectionState === 'some'; }}
          onChange={onSelectGroup}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <IconChevron open={open} className="size-3 shrink-0 text-neutral-400 dark:text-neutral-500" />
        <span className={`text-[11px] font-bold uppercase tracking-widest ${TM}`}>
          EOCP-{family}
        </span>
        <span className={`ml-auto text-[11px] tabular-nums ${TM}`}>{count}</span>
      </button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

async function getEnv(): Promise<EnvState> {
  const res = await fetch('/api/env');
  if (!res.ok) throw new Error(`Env request failed: ${res.status}`);
  return res.json();
}

async function postEnvRestart() {
  await fetch('/api/env/restart', { method: 'POST' });
}

export function App() {
  const [state, setState] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [env, setEnv] = useState<EnvState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [prefersDark, setPrefersDark] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    return getStoredTheme(window.localStorage.getItem(getThemeStorageKey()));
  });

  // Resizable last-execution panel
  const [panelHeight, setPanelHeight] = useState(240);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(240);
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartH.current = panelHeight;
    const onMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = dragStartY.current - ev.clientY;
      setPanelHeight(Math.max(80, Math.min(dragStartH.current + delta, window.innerHeight - 200)));
    };
    const onUp = () => {
      dragStartY.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  // Active family filters (empty = show all)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  // Which group headers are collapsed: key = "catalog|E1" or "coverage|E1"
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Coverage panel view mode
  const [coverageView, setCoverageView] = useState<'list' | 'chart' | 'eocp'>('list');

  const coverage = useMemo(() => {
    if (!state) return [];
    return buildCoverageState({ requirements: state.requirements, catalog: state.catalog, lastRun: state.lastRun });
  }, [state]);

  // All families present in catalog and coverage
  const catalogFamilies = useMemo(() =>
    allFamilies((state?.catalog ?? []).map((t) => testFamily(t.id))),
    [state]);

  const coverageFamilies = useMemo(() =>
    allFamilies(coverage.map((r) => reqFamily(r.id))),
    [coverage]);

  const allPanelFamilies = useMemo(() =>
    allFamilies([...catalogFamilies, ...coverageFamilies]),
    [catalogFamilies, coverageFamilies]);

  // Filtered + grouped catalog
  const catalogGroups = useMemo(() => {
    const tests = state?.catalog ?? [];
    const filtered = activeFilters.size === 0
      ? tests
      : tests.filter((t) => activeFilters.has(testFamily(t.id)));
    const map = new Map<string, typeof tests>();
    for (const t of filtered) {
      const fam = testFamily(t.id);
      if (!map.has(fam)) map.set(fam, []);
      map.get(fam)!.push(t);
    }
    return map;
  }, [state, activeFilters]);

  // Filtered + grouped coverage
  const coverageGroups = useMemo(() => {
    const filtered = activeFilters.size === 0
      ? coverage
      : coverage.filter((r) => activeFilters.has(reqFamily(r.id)));
    const map = new Map<string, typeof coverage>();
    for (const r of filtered) {
      const fam = reqFamily(r.id);
      if (!map.has(fam)) map.set(fam, []);
      map.get(fam)!.push(r);
    }
    return map;
  }, [coverage, activeFilters]);

  const resolvedTheme = getResolvedTheme(themePreference, prefersDark);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    setError(null);
    setState(await getSnapshot());
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  // Poll env status — fast while starting/stopping, slow when stable
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await getEnv();
        setEnv(next);
        const stable = next.status === 'up' || next.status === 'idle' || next.status === 'error';
        id = setTimeout(poll, stable ? 5000 : 1000);
      } catch {
        id = setTimeout(poll, 3000);
      }
    }
    poll();
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setPrefersDark(media.matches);
    sync();
    if (media.addEventListener) media.addEventListener('change', sync);
    else media.addListener(sync);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', sync);
      else media.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.classList.toggle('light', resolvedTheme === 'light');
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(getThemeStorageKey(), themePreference);
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    if (!themeMenuOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Node | null) || !themeMenuRef.current?.contains(e.target as Node)) setThemeMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setThemeMenuOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [themeMenuOpen]);

  function chooseTheme(next: ThemePreference) { setThemePreference(next); setThemeMenuOpen(false); }

  const toggleFilter = useCallback((f: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setActiveFilters(new Set()), []);

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((file: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file); else next.add(file);
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => setSelected(new Set()), []);

  const toggleGroupSelect = useCallback((files: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = files.every((f) => next.has(f));
      if (allSelected) files.forEach((f) => next.delete(f));
      else files.forEach((f) => next.add(f));
      return next;
    });
  }, []);

  async function triggerRun(scope: RunScope) {
    const id = scope.type === 'all' ? 'all' : scope.type === 'files' ? '__selected__' : (scope.value ?? null);
    setRunningId(id);
    setError(null);
    try {
      const res = await postRun(scope);
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningId(null);
    }
  }

  const lastRun = state?.lastRun ?? null;

  const visibleCatalogCount = [...catalogGroups.values()].reduce((s, a) => s + a.length, 0);
  const visibleCoverageCount = [...coverageGroups.values()].reduce((s, a) => s + a.length, 0);

  const themeEntries = [
    { key: 'system' as const, label: 'System',  Icon: IconMonitor },
    { key: 'light'  as const, label: 'Light',   Icon: IconSun },
    { key: 'dark'   as const, label: 'Dark',    Icon: IconMoon },
  ];
  const currentTheme = themeEntries.find((t) => t.key === themePreference)!;

  return (
    <main className={`flex h-screen w-full flex-col overflow-hidden bg-white font-sans dark:bg-neutral-950 ${T}`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b ${B} px-5 py-2.5`}>
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`size-5 shrink-0 ${TP}`} aria-hidden="true">
            <rect x="2" y="2" width="9" height="9" rx="1.5" />
            <rect x="13" y="2" width="9" height="9" rx="1.5" />
            <rect x="2" y="13" width="9" height="9" rx="1.5" />
            <rect x="13" y="13" width="9" height="9" rx="1.5" />
          </svg>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${TM}`}>
              Standalone test cockpit
            </p>
            <h1 className={`text-base font-bold leading-tight ${T}`}>
              DPMC Test Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme picker */}
          <div className="relative z-50" ref={themeMenuRef}>
            <button
              className={btnSec}
              type="button"
              onClick={() => setThemeMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={themeMenuOpen}
            >
              <currentTheme.Icon />
              {currentTheme.label}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3 opacity-50" aria-hidden="true">
                <path d="M4 6l4 4 4-4z" />
              </svg>
            </button>

            {themeMenuOpen && (
              <div
                className={`absolute right-0 top-[calc(100%+6px)] z-50 min-w-[9rem] rounded-xl border ${B} bg-white dark:bg-neutral-900 p-1 shadow-2xl`}
                role="menu"
                aria-label="Theme mode"
              >
                {themeEntries.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      themePreference === key
                        ? `${SURF} font-semibold ${T}`
                        : `${TM} hover:${SURF}`
                    }`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={themePreference === key}
                    onClick={() => chooseTheme(key)}
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run selected */}
          {selected.size > 0 && (
            <button
              className={btnSec}
              onClick={() => triggerRun({ type: 'files', values: [...selected] })}
              type="button"
              disabled={loading || Boolean(runningId)}
            >
              {runningId === '__selected__' ? <IconSpinner /> : <IconPlay />}
              {runningId === '__selected__' ? 'Running…' : `Run selected (${selected.size})`}
            </button>
          )}
          {selected.size > 0 && (
            <button className={btnSec} type="button" onClick={clearSelected} disabled={Boolean(runningId)}>
              Clear
            </button>
          )}
          {/* Run all */}
          <button
            className={btnPri}
            onClick={() => triggerRun({ type: 'all' })}
            type="button"
            disabled={loading || Boolean(runningId)}
          >
            {runningId === 'all' ? <IconSpinner /> : <IconPlay />}
            {runningId === 'all' ? 'Running…' : 'Run all tests'}
          </button>
        </div>
      </header>

      {/* ── Environment strip ────────────────────────────────────────────── */}
      <EnvPanel env={env} onRestart={() => { postEnvRestart().catch(() => {}); }} />

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className={`flex shrink-0 items-start gap-2.5 border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-2.5 text-sm text-red-700 dark:text-red-400`}>
          <IconAlertCircle className="mt-px size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className={`flex shrink-0 items-stretch border-b ${B} ${DX}`}>
        <div className="flex items-center gap-3 px-5 py-3">
          <IconBeaker className={`size-4 shrink-0 ${TM}`} />
          <div>
            <p className={`text-2xl font-bold leading-none ${T}`}>{state?.catalog.length ?? '—'}</p>
            <p className={`mt-0.5 text-xs ${TM}`}>Tests in catalog</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3">
          <IconShield className={`size-4 shrink-0 ${TM}`} />
          <div>
            <p className={`text-2xl font-bold leading-none ${T}`}>{coverage.length || '—'}</p>
            <p className={`mt-0.5 text-xs ${TM}`}>Requirements tracked</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3">
          <IconActivity className={`size-4 shrink-0 ${TM}`} />
          <div>
            {lastRun ? (
              <>
                <p className={`text-2xl font-bold capitalize leading-none ${lastRun.status === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {lastRun.status}
                </p>
                <p className={`mt-0.5 text-xs ${TM}`}>
                  {lastRun.summary.passed} passed · {lastRun.summary.failed} failed · {lastRun.summary.skipped} skipped <span className="opacity-60">(suites)</span>
                </p>
              </>
            ) : (
              <>
                <p className={`text-2xl font-bold leading-none ${TM}`}>Idle</p>
                <p className={`mt-0.5 text-xs ${TM}`}>No execution yet</p>
              </>
            )}
          </div>
        </div>

        {/* Active filter indicator */}
        {activeFilters.size > 0 && (
          <div className="flex items-center gap-2 px-5 py-3">
            <span className={`text-xs ${TM}`}>Filtering:</span>
            {[...activeFilters].sort().map((f) => (
              <span key={f} className={`${chipBase} bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300`}>
                EOCP-{f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Filter bar (shared for both panels) ───────────────────────────── */}
      {allPanelFamilies.length > 0 && (
        <div className={`shrink-0 border-b ${B} bg-white dark:bg-neutral-950`}>
          <FilterBar
            families={allPanelFamilies}
            active={activeFilters}
            onToggle={toggleFilter}
            onClear={clearFilters}
          />
        </div>
      )}

      {/* ── Main panels ───────────────────────────────────────────────────── */}
      <div className={`grid min-h-0 flex-1 grid-cols-2 ${DX} max-[1100px]:grid-cols-1`}>

        {/* ── Test catalog ──────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col">
          <div className={`flex h-[41px] shrink-0 items-center justify-between border-b ${B} px-4 ${SURF}`}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${TM}`}>
              <IconBeaker />
              Test catalog
            </div>
            <span className={`text-xs ${TM}`}>
              {visibleCatalogCount}{activeFilters.size > 0 ? ` / ${state?.catalog.length ?? 0}` : ''} tests
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <p className={`px-4 py-3 text-sm ${TM}`}>Loading…</p>}
            {[...catalogGroups.entries()].map(([family, tests]) => {
              const groupKey = `catalog|${family}`;
              const isOpen = !collapsed.has(groupKey);
              const groupFiles = tests.map((t) => t.file);
              const selectedCount = groupFiles.filter((f) => selected.has(f)).length;
              const selectionState = selectedCount === 0 ? 'none' : selectedCount === groupFiles.length ? 'all' : 'some';
              return (
                <div key={family}>
                  <GroupHeader
                    family={family}
                    count={tests.length}
                    open={isOpen}
                    onToggle={() => toggleCollapsed(groupKey)}
                    selectionState={selectionState}
                    onSelectGroup={() => toggleGroupSelect(groupFiles)}
                  />
                  {isOpen && (
                    <div className={DY}>
                      {tests.map((test) => (
                        <div className={`px-4 py-3 transition-colors ${selected.has(test.file) ? 'bg-blue-50 dark:bg-blue-500/5' : HOVER}`} key={test.id}>
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
                              <input
                                type="checkbox"
                                className="mt-1 size-3.5 shrink-0 accent-blue-600"
                                checked={selected.has(test.file)}
                                onChange={() => toggleSelect(test.file)}
                              />
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold leading-5 ${TP}`}>{test.name}</p>
                                <p className={`break-all text-xs leading-5 ${TM}`}>{test.file}</p>
                              </div>
                            </label>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              {test.requirements.map((req) => (
                                <span className={chipNeutral} key={req}>{req}</span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 ml-6">
                            <button
                              className={btnSec}
                              onClick={() => triggerRun({ type: 'file', value: test.file })}
                              type="button"
                              disabled={loading || Boolean(runningId)}
                            >
                              {runningId === test.file ? <IconSpinner /> : <IconPlay />}
                              {runningId === test.file ? 'Running…' : 'Run'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && visibleCatalogCount === 0 && (
              <p className={`px-4 py-6 text-center text-sm ${TM}`}>No tests match the active filter.</p>
            )}
          </div>
        </div>

        {/* ── Requirement coverage ──────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col">
          <div className={`flex h-[41px] shrink-0 items-center justify-between border-b ${B} px-4 ${SURF}`}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${TM}`}>
              <IconShield />
              Requirement coverage
            </div>
            <div className="flex items-center gap-3">
              {/* legend – only in list view */}
              {coverageView === 'list' && (
                <div className={`hidden items-center gap-2 text-xs xl:flex ${TM}`}>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-emerald-500" />passed</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-red-500" />failed</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-amber-400" />skipped</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />missing</span>
                </div>
              )}
              {/* view toggle */}
              <div className={`flex items-center rounded-md border ${B} overflow-hidden`}>
                <button
                  type="button"
                  title="List view"
                  onClick={() => setCoverageView('list')}
                  className={`flex items-center px-2 py-1.5 transition-colors ${coverageView === 'list' ? `bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400` : `${TM} hover:bg-neutral-100 dark:hover:bg-neutral-800`}`}
                >
                  <IconList className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Chart per requirement"
                  onClick={() => setCoverageView('chart')}
                  className={`flex items-center px-2 py-1.5 transition-colors border-l ${B} ${coverageView === 'chart' ? `bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400` : `${TM} hover:bg-neutral-100 dark:hover:bg-neutral-800`}`}
                >
                  <IconBarChart2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Chart per EOCP family"
                  onClick={() => setCoverageView('eocp')}
                  className={`flex items-center px-2 py-1.5 transition-colors border-l ${B} ${coverageView === 'eocp' ? `bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400` : `${TM} hover:bg-neutral-100 dark:hover:bg-neutral-800`}`}
                >
                  <IconLayers className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(coverageView === 'chart' || coverageView === 'eocp') ? (
              <div className="overflow-x-hidden">
                {visibleCoverageCount === 0
                  ? <p className={`py-6 text-center text-sm ${TM}`}>No requirements match the active filter.</p>
                  : <CoverageChart groups={coverageGroups} isDark={resolvedTheme === 'dark'} mode={coverageView} />
                }
              </div>
            ) : (
              <>
                {[...coverageGroups.entries()].map(([family, items]) => {
                  const groupKey = `coverage|${family}`;
                  const isOpen = !collapsed.has(groupKey);
                  return (
                    <div key={family}>
                      <GroupHeader
                        family={family}
                        count={items.length}
                        open={isOpen}
                        onToggle={() => toggleCollapsed(groupKey)}
                      />
                      {isOpen && (
                        <div className={DY}>
                          {items.map((item) => (
                            <div className={`px-4 py-3 transition-colors ${HOVER}`} key={item.id}>
                              <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-semibold leading-5 ${TP}`}>{item.id}</p>
                                  <p className={`text-xs leading-5 ${TM}`}>{item.label}</p>
                                </div>
                                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                  {item.passed  > 0 && <span className={chipStatus.passed} ><IconCheck />       {item.passed}%</span>}
                                  {item.failed  > 0 && <span className={chipStatus.failed} ><IconXMark />       {item.failed}%</span>}
                                  {item.skipped > 0 && <span className={chipStatus.skipped}><IconSkipForward /> {item.skipped}%</span>}
                                  {item.missing > 0 && <span className={chipStatus.missing}><IconMinus />       {item.missing}%</span>}
                                </div>
                              </div>
                              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                {item.passed  > 0 && <span className="shrink-0 bg-emerald-500" style={{ width: `${item.passed}%`  }} />}
                                {item.failed  > 0 && <span className="shrink-0 bg-red-500"     style={{ width: `${item.failed}%`  }} />}
                                {item.skipped > 0 && <span className="shrink-0 bg-amber-400"   style={{ width: `${item.skipped}%` }} />}
                                {item.missing > 0 && <span className="shrink-0 bg-neutral-400 dark:bg-neutral-600" style={{ width: `${item.missing}%` }} />}
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.tests.map((t) => (
                                  <span className={chipStatus[t.status]} key={t.id}>
                                    {statusIcon[t.status]}
                                    {t.id}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!loading && visibleCoverageCount === 0 && (
                  <p className={`px-4 py-6 text-center text-sm ${TM}`}>No requirements match the active filter.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Last execution ────────────────────────────────────────────────── */}
      <section
        className={`flex shrink-0 flex-col border-t ${B}`}
        style={{ height: `${panelHeight}px` }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onResizeMouseDown}
          className="group relative flex h-1 shrink-0 cursor-row-resize items-center justify-center"
          title="Drag to resize"
        >
          <span className="absolute h-1 w-full group-hover:bg-blue-500/30 transition-colors" />
          <span className="relative z-10 h-0.5 w-8 rounded-full bg-neutral-300 dark:bg-neutral-700 group-hover:bg-blue-500 transition-colors" />
        </div>
        <div className={`flex shrink-0 items-center justify-between border-b ${B} px-5 py-2 ${SURF}`}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${TM}`}>
            <IconTerminal />
            Last execution
          </div>
          <span className={`truncate text-xs ${TM}`}>
            {lastRun ? lastRun.command.join(' ') : 'No command run yet'}
          </span>
        </div>

        {loading && !lastRun && (
          <p className={`px-5 py-3 text-sm ${TM}`}>Loading dashboard state…</p>
        )}

        {lastRun ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-5 pb-3 pt-2.5">
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${TM}`}>
              <strong className={`font-bold ${lastRun.status === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : lastRun.status === 'skipped' ? 'text-amber-500 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {lastRun.status.toUpperCase()}
              </strong>
              <span>{lastRun.summary.passed} passed · {lastRun.summary.failed} failed · {lastRun.summary.skipped} skipped <span className="opacity-60">(suites)</span></span>
              <span>{lastRun.startedAt} → {lastRun.finishedAt}</span>
            </div>
            <pre className={`m-0 min-h-0 flex-1 overflow-auto rounded-xl border ${B} bg-neutral-50 dark:bg-[#0d1117] px-4 py-3 font-mono text-xs leading-5 ${T}`}>
              {lastRun.stderr || lastRun.stdout
                ? <ColoredLog text={lastRun.stderr || lastRun.stdout} />
                : 'No log output'}
            </pre>
          </div>
        ) : !loading && (
          <p className={`px-5 py-3 text-sm ${TM}`}>
            Run a test to populate the failure panel and logs.
          </p>
        )}
      </section>
    </main>
  );
}
