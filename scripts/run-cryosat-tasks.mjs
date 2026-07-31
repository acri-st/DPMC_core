// Create + trigger one Chain task per dataset name, through the DPMC API.
//
//   DPMC_USER=<login> DPMC_PASSWORD=<password> \
//   node scripts/run-cryosat-tasks.mjs --chain <productionChainId> <dataset-name>...
//
// Env (defaults target prod):
//   DPMC_API_URL        default https://dpmc-api.operation.acrist-services.com/api
//   DPMC_KEYCLOAK_URL   default https://dpmc-keycloak.operation.acrist-services.com
//   DPMC_KEYCLOAK_REALM default dpmc     (client dpmc-api is public — no secret)
//   DPMC_USER / DPMC_PASSWORD  required
//
// The prod certificate does not cover *.operation.acrist-services.com — run
// with NODE_TLS_REJECT_UNAUTHORIZED=0 (same stance as the API itself).

const API =
  process.env.DPMC_API_URL ??
  'https://dpmc-api.operation.acrist-services.com/api';
const KC =
  process.env.DPMC_KEYCLOAK_URL ??
  'https://dpmc-keycloak.operation.acrist-services.com';
const REALM = process.env.DPMC_KEYCLOAK_REALM ?? 'dpmc';

const argv = process.argv.slice(2);
const chainIdx = argv.indexOf('--chain');
const chainId = chainIdx >= 0 ? Number(argv[chainIdx + 1]) : NaN;
const datasetNames = argv.filter(
  (a, i) => !a.startsWith('--') && i !== chainIdx + 1,
);
if (!Number.isFinite(chainId) || datasetNames.length === 0)
  throw new Error(
    'usage: run-cryosat-tasks.mjs --chain <id> <dataset-name>...',
  );
for (const k of ['DPMC_USER', 'DPMC_PASSWORD'])
  if (!process.env[k]) throw new Error(`missing env ${k}`);

async function json(res) {
  const text = await res.text();
  if (!res.ok)
    throw new Error(`${res.status} ${res.url}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

// Password grant on the public dpmc-api client.
const tokenRes = await fetch(
  `${KC}/realms/${REALM}/protocol/openid-connect/token`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'dpmc-api',
      username: process.env.DPMC_USER,
      password: process.env.DPMC_PASSWORD,
    }),
  },
);
const { access_token } = await json(tokenRes);
const headers = {
  Authorization: `Bearer ${access_token}`,
  'Content-Type': 'application/json',
};

const api = (path, init) =>
  fetch(`${API}${path}`, {
    headers,
    ...init,
    headers: { ...headers, ...init?.headers },
  });

for (const name of datasetNames) {
  // Resolve the dataset by exact name.
  const list = await json(
    await api(`/dataset?name=${encodeURIComponent(name)}&pageSize=10`),
  );
  const ds = list.data.find((d) => d.name === name);
  if (!ds) throw new Error(`dataset not found: ${name}`);

  const created = await json(
    await api('/task', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'Chain',
        productionChainId: chainId,
        inputDatasetId: ds.id,
        productionMode: 'Generic',
        scheduledStartTime: new Date().toISOString(),
        comment: `auto: ${name}`,
      }),
    }),
  );
  const taskId = created.data.id;
  await json(await api(`/task/${taskId}/trigger`, { method: 'POST' }));
  console.log(
    `task ${taskId} triggered  chain=${chainId} dataset=${ds.id} (${name})`,
  );
}
