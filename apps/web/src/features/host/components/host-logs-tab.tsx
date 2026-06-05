import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircleIcon,
  ChevronsDownIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils';
import { HostLogLevelBadge } from '@/features/host/components/host-log-level-badge';
import { HostLogRow } from '@/features/host/components/host-log-row';
import { useHostLogsStream } from '@/features/host/hooks/use-host-logs-stream';
import type { HostLogEntry } from '@/features/host/services/host-logs.service';

const ALL_LEVELS: HostLogEntry['level'][] = [
  'Debug',
  'Info',
  'Warning',
  'Error',
  'Critical',
];
const DEFAULT_LEVELS: HostLogEntry['level'][] = [
  'Info',
  'Warning',
  'Error',
  'Critical',
];

type Props = { hostId: number };

export function HostLogsTab({ hostId }: Props) {
  const {
    logs,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh,
    liveStatus,
    livePulse,
  } = useHostLogsStream(hostId);

  const [enabledLevels, setEnabledLevels] = useState<
    Set<HostLogEntry['level']>
  >(() => new Set(DEFAULT_LEVELS));
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [pendingNew, setPendingNew] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastPulseRef = useRef(livePulse);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (!enabledLevels.has(l.level)) return false;
      if (q && !l.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, enabledLevels, search]);

  // When a new live event arrives:
  // - If auto-scroll on, jump to the top (most recent)
  // - Otherwise, increment the "new" badge counter
  useEffect(() => {
    if (livePulse === lastPulseRef.current) return;
    lastPulseRef.current = livePulse;
    if (autoScroll) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setPendingNew((c) => c + 1);
    }
  }, [livePulse, autoScroll]);

  // Detect manual scroll to suspend auto-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop > 80) {
        setAutoScroll(false);
      } else {
        setAutoScroll(true);
        setPendingNew(0);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver to auto-load older logs when sentinel scrolls in.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { root: scrollRef.current, rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const toggleLevel = (level: HostLogEntry['level']) => {
    setEnabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const jumpToTop = () => {
    setAutoScroll(true);
    setPendingNew(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col gap-2">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
        <span className="text-muted-foreground text-xs">Level</span>
        <div className="flex flex-wrap items-center gap-1">
          {ALL_LEVELS.map((level) => {
            const active = enabledLevels.has(level);
            return (
              <button
                type="button"
                key={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  'rounded-md transition-opacity',
                  active ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                )}
                aria-pressed={active}
              >
                <HostLogLevelBadge level={level} />
              </button>
            );
          })}
        </div>

        <div className="ml-2 flex min-w-0 flex-1 items-center gap-1">
          <SearchIcon className="text-muted-foreground size-3.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search message…"
            className="h-7 max-w-xs border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <LiveIndicator status={liveStatus} pulseKey={livePulse} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            className="h-7"
          >
            <RefreshCwIcon className={cn(isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pending live updates badge (visible only when auto-scroll is paused) */}
      {!autoScroll && pendingNew > 0 ? (
        <button
          type="button"
          onClick={jumpToTop}
          className="bg-primary text-primary-foreground hover:bg-primary/90 z-10 mx-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs shadow"
        >
          <ChevronsDownIcon className="size-3 rotate-180" />+{pendingNew} new
        </button>
      ) : null}

      {/* Log list */}
      <div
        ref={scrollRef}
        className="bg-card flex-1 overflow-y-auto rounded-md border"
      >
        {error ? (
          <div className="text-destructive flex items-start gap-2 p-4 text-sm">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {isLoading && logs.length === 0 ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 p-8 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading logs…
          </div>
        ) : null}

        {!isLoading && filtered.length === 0 && logs.length > 0 ? (
          <div className="text-muted-foreground p-4 text-center text-sm">
            No logs match the current filters.
          </div>
        ) : null}

        {!isLoading && logs.length === 0 && !error ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No logs yet. Waiting for live events…
          </div>
        ) : null}

        {filtered.map((l) => (
          <HostLogRow key={l.id} log={l} search={search.trim()} />
        ))}

        {/* Sentinel for infinite-scroll back-pagination */}
        {hasMore ? (
          <div
            ref={sentinelRef}
            className="text-muted-foreground flex items-center justify-center gap-2 p-3 text-xs"
          >
            {isLoadingMore ? (
              <>
                <Loader2Icon className="size-3 animate-spin" /> Loading earlier…
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadMore()}
                className="h-7"
              >
                Load earlier 100
              </Button>
            )}
          </div>
        ) : logs.length > 0 ? (
          <div className="text-muted-foreground p-3 text-center text-xs">
            — beginning of history —
          </div>
        ) : null}
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-[11px]">
        <span>
          {filtered.length}/{logs.length} shown
          {logs.length >= 5_000 ? ' (buffer cap)' : ''}
        </span>
        <span>
          Auto-scroll{' '}
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {autoScroll ? 'on' : 'paused'}
          </Badge>
        </span>
      </div>
    </div>
  );
}

function LiveIndicator({
  status,
  pulseKey,
}: {
  status: 'connecting' | 'live' | 'offline';
  pulseKey: number;
}) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <span
          // The key forces a re-mount so the pulse animation replays.
          key={pulseKey}
          className="relative flex size-2"
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <WifiIcon className="size-3 animate-pulse" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-rose-600">
      <WifiOffIcon className="size-3" />
      Offline
    </span>
  );
}
