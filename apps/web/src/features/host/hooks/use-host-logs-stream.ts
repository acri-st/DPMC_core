import { useCallback, useEffect, useRef, useState } from 'react';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  acquireMonitoringSocket,
  releaseMonitoringSocket,
} from '@/shared/libs/socket';
import {
  listHostLogs,
  type HostLogEntry,
} from '@/features/host/services/host-logs.service';

const PAGE_SIZE = 100;
const MAX_BUFFER = 5_000;

type WsHostLogPayload = {
  hostId: number;
  logs: ReadonlyArray<{
    id: number;
    level: HostLogEntry['level'];
    message: string;
    loggedAt: string;
    createdAt: string;
  }>;
};

type LiveStatus = 'connecting' | 'live' | 'offline';

export type UseHostLogsStream = {
  logs: HostLogEntry[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  liveStatus: LiveStatus;
  /**
   * Increments by 1 each time a live event is received. Useful as a UI
   * trigger (e.g. pulse the live indicator).
   */
  livePulse: number;
};

/**
 * Combines an initial historical fetch with a live WebSocket tail.
 *
 * On mount:
 *   1. GET /host/:id/logs?limit=100  → seed buffer (most recent first)
 *   2. Connect to monitoring namespace, subscribe to `host:<id>` room
 *   3. On `host.log.created` → prepend new entries (dedup by id), cap buffer
 *
 * On unmount:
 *   - Off the listener and release the shared socket reference.
 */
export function useHostLogsStream(hostId: number | null): UseHostLogsStream {
  const { status: authStatus } = useCurrentUser();
  const enabled =
    hostId != null && !Number.isNaN(hostId) && authStatus === 'authenticated';

  const [logs, setLogs] = useState<HostLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('connecting');
  const [livePulse, setLivePulse] = useState(0);

  const oldestBeforeRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());

  const seed = useCallback(async () => {
    if (!hostId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { logs: page, nextBefore } = await listHostLogs(hostId, {
        limit: PAGE_SIZE,
      });
      seenIdsRef.current = new Set(page.map((l) => l.id));
      setLogs(page);
      setHasMore(nextBefore !== null);
      oldestBeforeRef.current = nextBefore;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  const loadMore = useCallback(async () => {
    if (!hostId || !hasMore || isLoadingMore || !oldestBeforeRef.current)
      return;
    setIsLoadingMore(true);
    try {
      const { logs: page, nextBefore } = await listHostLogs(hostId, {
        limit: PAGE_SIZE,
        before: oldestBeforeRef.current,
      });
      const fresh = page.filter((l) => !seenIdsRef.current.has(l.id));
      for (const l of fresh) seenIdsRef.current.add(l.id);
      setLogs((prev) => {
        const next = [...prev, ...fresh];
        return next.length > MAX_BUFFER ? next.slice(0, MAX_BUFFER) : next;
      });
      setHasMore(nextBefore !== null);
      oldestBeforeRef.current = nextBefore;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more logs');
    } finally {
      setIsLoadingMore(false);
    }
  }, [hostId, hasMore, isLoadingMore]);

  // Initial seed on hostId change.
  useEffect(() => {
    if (!enabled) return;
    void seed();
  }, [enabled, seed]);

  // WebSocket subscription.
  useEffect(() => {
    if (!enabled || !hostId) return;

    const socket = acquireMonitoringSocket();
    let cancelled = false;

    const onConnect = () => {
      if (cancelled) return;
      setLiveStatus('live');
      socket.emit('subscribe', { kind: 'host', id: hostId });
    };
    const onDisconnect = () => {
      if (cancelled) return;
      setLiveStatus('offline');
    };
    const onConnectError = () => {
      if (cancelled) return;
      setLiveStatus('offline');
    };
    const onLogCreated = (payload: WsHostLogPayload) => {
      if (cancelled) return;
      if (payload.hostId !== hostId) return;
      setLivePulse((p) => p + 1);
      setLogs((prev) => {
        const fresh: HostLogEntry[] = [];
        for (const l of payload.logs) {
          if (seenIdsRef.current.has(l.id)) continue;
          seenIdsRef.current.add(l.id);
          fresh.push({ ...l, hostId: payload.hostId });
        }
        if (fresh.length === 0) return prev;
        // Most recent first within the incoming chunk.
        fresh.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
        const next = [...fresh, ...prev];
        return next.length > MAX_BUFFER ? next.slice(0, MAX_BUFFER) : next;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('host.log.created', onLogCreated);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      cancelled = true;
      socket.emit('unsubscribe', { kind: 'host', id: hostId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('host.log.created', onLogCreated);
      releaseMonitoringSocket();
    };
  }, [enabled, hostId]);

  return {
    logs,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh: seed,
    liveStatus,
    livePulse,
  };
}
