const ESC = "\x1b[";
const c = {
  reset: `${ESC}0m`,
  dim: `${ESC}2m`,
  bold: `${ESC}1m`,
  green: `${ESC}32m`,
  red: `${ESC}31m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
  blue: `${ESC}34m`,
} as const;

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;
const NON_TTY_PROGRESS_INTERVAL_MS = 2000;
const ITEMS_PREVIEW_LIMIT = 8;

const isTty = Boolean(process.stdout.isTTY);

export type StepResult = {
  count: number;
  items: string[];
};

export type Progress = {
  /** Set the total expected count (call once when known). */
  setTotal: (total: number) => void;
  /** Report the current count (absolute, not delta). */
  update: (current: number) => void;
};

function formatItems(items: string[]): string {
  if (items.length <= ITEMS_PREVIEW_LIMIT) return items.join(", ");
  const head = items.slice(0, ITEMS_PREVIEW_LIMIT).join(", ");
  return `${head}, +${items.length - ITEMS_PREVIEW_LIMIT} more`;
}

function clearLine() {
  process.stdout.write(`\r${ESC}K`);
}

function formatProgress(current: number, total: number | null): string {
  if (total === null) {
    if (current === 0) return "";
    return ` ${c.gray}${current.toLocaleString()}${c.reset}`;
  }
  const pct = total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 0;
  return ` ${c.gray}${current.toLocaleString()}/${total.toLocaleString()} (${pct}%)${c.reset}`;
}

export async function runStep(
  label: string,
  fn: (progress: Progress) => Promise<StepResult>,
): Promise<StepResult> {
  const start = Date.now();
  let timer: NodeJS.Timeout | null = null;

  let current = 0;
  let total: number | null = null;
  let lastReportedAt = 0;

  const progress: Progress = {
    setTotal(t) {
      total = t;
    },
    update(value) {
      current = value;
      if (!isTty) {
        const now = Date.now();
        if (now - lastReportedAt >= NON_TTY_PROGRESS_INTERVAL_MS) {
          lastReportedAt = now;
          process.stdout.write(`    ${label}: ${formatProgress(current, total).trim()}\n`);
        }
      }
    },
  };

  if (isTty) {
    let frame = 0;
    timer = setInterval(() => {
      frame = (frame + 1) % SPINNER_FRAMES.length;
      clearLine();
      process.stdout.write(
        `  ${c.cyan}${SPINNER_FRAMES[frame]}${c.reset} ${label}…${formatProgress(current, total)}`,
      );
    }, SPINNER_INTERVAL_MS);
  } else {
    process.stdout.write(`  → ${label}…\n`);
  }

  try {
    const result = await fn(progress);
    if (timer) clearInterval(timer);
    const ms = Date.now() - start;
    if (isTty) clearLine();

    process.stdout.write(
      `  ${c.green}✔${c.reset} ${label} ${c.cyan}(${result.count.toLocaleString()})${c.reset} ${c.dim}${ms}ms${c.reset}\n`,
    );
    if (result.items.length > 0) {
      process.stdout.write(`    ${c.gray}└─ ${formatItems(result.items)}${c.reset}\n`);
    }
    return result;
  } catch (err) {
    if (timer) clearInterval(timer);
    if (isTty) clearLine();
    process.stdout.write(`  ${c.red}✘${c.reset} ${label}\n`);
    throw err;
  }
}

export function header(text: string) {
  process.stdout.write(`\n${c.bold}${c.blue}${text}${c.reset}\n\n`);
}

export function done(totalMs: number) {
  process.stdout.write(
    `\n${c.green}✔${c.reset} Seeding done in ${c.bold}${totalMs}ms${c.reset}\n\n`,
  );
}

export function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stdout.write(`\n${c.red}✘ Seeding failed:${c.reset} ${message}\n\n`);
}
