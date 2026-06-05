import { useEffect, useState } from 'react';

import { cn } from '@/shared/utils';

const PALETTE = [
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  'bg-teal-500/15 text-teal-700 dark:text-teal-400',
];

type UserAvatarProps = {
  src?: string | null;
  displayName: string;
  className?: string;
};

export function UserAvatar({ src, displayName, className }: UserAvatarProps) {
  const [imageOk, setImageOk] = useState<boolean>(Boolean(src));

  useEffect(() => {
    setImageOk(Boolean(src));
  }, [src]);

  const initials = computeInitials(displayName);
  const tone = PALETTE[hashIndex(displayName, PALETTE.length)];

  return (
    <span
      className={cn(
        'relative inline-flex size-8 shrink-0 overflow-hidden rounded-full',
        tone,
        className,
      )}
      aria-label={displayName}
    >
      {imageOk && src ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setImageOk(false)}
        />
      ) : (
        <span className="m-auto text-[11px] font-semibold uppercase">
          {initials}
        </span>
      )}
    </span>
  );
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[parts.length - 1][0]}`;
}

function hashIndex(input: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}
