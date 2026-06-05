import { io, type Socket } from 'socket.io-client';

/**
 * Lazy singleton socket connection to the API `monitoring` namespace.
 *
 * The socket auto-reconnects on disconnects (default behavior of socket.io)
 * and shares a single underlying TCP/WebSocket connection across the app.
 * Auth is handled server-side via the Keycloak session cookie — we just need
 * to make sure the connection sends credentials.
 */

const API_BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api'
).replace(/\/$/, '');

// The namespace lives under the API host, NOT under `/api`. Strip the trailing
// `/api` if present so we end up with `http://localhost:3000/monitoring`.
const SOCKET_BASE = API_BASE_URL.replace(/\/api$/, '');

let monitoringSocket: Socket | null = null;
let refCount = 0;

export function acquireMonitoringSocket(): Socket {
  if (!monitoringSocket) {
    monitoringSocket = io(`${SOCKET_BASE}/monitoring`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });
  }
  refCount += 1;
  return monitoringSocket;
}

/**
 * Release a reference. When the last consumer releases, we close the socket
 * to free the connection. Re-acquiring later spawns a fresh socket.
 */
export function releaseMonitoringSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && monitoringSocket) {
    monitoringSocket.close();
    monitoringSocket = null;
  }
}
