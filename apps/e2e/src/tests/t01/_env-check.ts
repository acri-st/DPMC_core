import { API } from '../../support/auth';

// Call once at the top of a beforeAll to abort the suite immediately if the
// pre-started e2e stack is not reachable. Avoids misleading "connection
// refused" failures on every individual test.
export async function requireEnvReady(timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API}/status`);
      if (res.ok) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `e2e stack is not reachable at ${API} — start it with "pnpm dashboard" first.\n${lastErr}`,
  );
}
