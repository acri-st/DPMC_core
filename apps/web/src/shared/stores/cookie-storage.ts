import type { StateStorage } from 'zustand/middleware';

const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=/`,
    `max-age=${ONE_YEAR}`,
    `SameSite=Lax`,
  ].join('; ');
}

function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

export const cookieStorage: StateStorage = {
  getItem: (name) => readCookie(name),
  setItem: (name, value) => writeCookie(name, value),
  removeItem: (name) => removeCookie(name),
};
