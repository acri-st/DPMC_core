import type { PlanStatus } from '../data/types';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escapes the closing </script> sequence so a JSON payload can be embedded
// safely inside a <script type="application/json"> tag.
export function escapeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script/gi, '<\\/script');
}

export function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|');
}

export function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function barColor(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-500';
  if (percentage >= 50) return 'bg-amber-500';
  if (percentage > 0) return 'bg-orange-500';
  return 'bg-slate-300';
}

export function renderProgressBar(percentage: number, height = 'h-2'): string {
  const color = barColor(percentage);
  return `
    <div class="${height} bg-slate-200 rounded-full overflow-hidden">
      <div class="h-full ${color} transition-all" style="width: ${percentage}%"></div>
    </div>`;
}

export function iconFor(status: PlanStatus, hasBlocker: boolean): string {
  if (status === 'passed') return '✓';
  if (status === 'failed') return '✗';
  if (status === 'skipped') return '–';
  if (status === 'untagged') return '?';
  return hasBlocker ? '⊘' : '○';
}
