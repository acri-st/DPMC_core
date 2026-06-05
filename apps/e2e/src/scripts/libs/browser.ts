import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Open a file in the user's default browser. Tries each candidate opener in
 * order and stops at the first one that exists on PATH. WSL is detected
 * explicitly so we reach for `wslview` / `explorer.exe` (which round-trip
 * Linux paths to Windows) before falling back to `xdg-open`.
 *
 * Set E2E_NO_OPEN=1 to skip auto-opening entirely.
 */
export function openInBrowser(filePath: string): void {
  if (process.env.E2E_NO_OPEN === '1') return;
  const url = `file://${filePath}`;

  for (const { cmd, args } of openerCandidates(filePath, url)) {
    if (!isOnPath(cmd)) continue;
    try {
      spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
      console.log(`Opening ${url} (via ${cmd}) …`);
      return;
    } catch {
      // try the next candidate
    }
  }
  console.warn(`Could not auto-open browser. Open manually: ${url}`);
}

interface Opener {
  cmd: string;
  args: string[];
}

function openerCandidates(filePath: string, url: string): Opener[] {
  if (process.platform === 'darwin') {
    return [{ cmd: 'open', args: [url] }];
  }
  if (process.platform === 'win32') {
    return [{ cmd: 'cmd', args: ['/c', 'start', '', url] }];
  }
  // Linux — WSL first, then native Linux. explorer.exe needs a Windows-style
  // path (UNC \\wsl.localhost\<distro>\…), so convert via `wslpath -w`.
  if (isWsl()) {
    const winPath = toWindowsPath(filePath);
    return [
      { cmd: 'wslview', args: [url] },
      { cmd: 'explorer.exe', args: [winPath ?? url] },
      { cmd: 'xdg-open', args: [url] },
    ];
  }
  return [{ cmd: 'xdg-open', args: [url] }];
}

function toWindowsPath(filePath: string): string | null {
  const r = spawnSync('wslpath', ['-w', filePath], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

function isWsl(): boolean {
  if (!existsSync('/proc/version')) return false;
  const v = readFileSync('/proc/version', 'utf8').toLowerCase();
  return v.includes('microsoft') || v.includes('wsl');
}

function isOnPath(cmd: string): boolean {
  // POSIX `command -v` returns 0 if the command resolves on PATH.
  const r = spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
  return r.status === 0;
}
