// Ingest CryoSat products as DPMC Products + a Dataset.
//
// Two modes, mirroring how inputs were fed to the processors historically:
//
//   WD mode      — a TDS working directory: every file goes into the dataset.
//     node scripts/ingest-cryosat.mjs --wd <dir> [dataset-name]
//
//   Listing mode — an HPC-style .lst file (one input set per L0, as produced
//     by the operational broker) + a directory holding the listed files
//     (.ZIP wrappers are extracted, their members ingested):
//     node scripts/ingest-cryosat.mjs --lst <file.lst> --data <dir> [dataset-name]
//
// In both modes the L0 science files (SIR1LRM_0_/SIR1SAR_0_/SIR1SIN_0_) get
// role=input and everything else role=aux: TaskService builds a shared aux
// dataset from role!=input products and attaches it to every non-entry batch,
// which is how AUX_* files reach the IPF2/P2P nodes.
//
// Env-driven so it works against any environment (local dev or the cluster
// through port-forwards):
//   DATABASE_URL  e.g. postgresql://postgres:postgres@localhost:5433/postgres
//   S3_ENDPOINT   e.g. http://localhost:9002
//   S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET (default dpmc)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(repoRoot, 'packages/prisma/package.json'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require(
  join(repoRoot, 'packages/prisma/dist/client.js'),
);
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function usage() {
  throw new Error(
    'usage: ingest-cryosat.mjs --wd <dir> [dataset]  |  --lst <file.lst> --data <dir> [dataset]',
  );
}
const argv = process.argv.slice(2);
const opt = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const wdDir = opt('--wd');
const lstFile = opt('--lst');
const dataDir = opt('--data');
const positional = argv.filter(
  (a, i) => !a.startsWith('--') && argv[i - 1]?.startsWith('--') !== true,
);
if (!wdDir && !(lstFile && dataDir)) usage();
const datasetName =
  positional[0] ??
  (lstFile ? basename(lstFile).replace(/\.lst$/i, '') : basename(wdDir));

for (const k of [
  'DATABASE_URL',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
])
  if (!process.env[k]) throw new Error(`missing env ${k}`);

const BUCKET = process.env.S3_BUCKET ?? 'dpmc';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

// EE file name: <mission 2-3>_<class 4>_<type 10>_… — handles the CS_ product
// prefix, the HPC's CR2_ wrapper prefix, and underscore-padded file classes
// (CS_LTA__…).
const typeOf = (name) => /^[A-Z0-9]{2,3}_[A-Z0-9_]{4}_(.{10})/.exec(name)?.[1];
const PRIMARY_L0 = new Set(['SIR1LRM_0_', 'SIR1SAR_0_', 'SIR1SIN_0_']);
const roleOf = (acronym) => (PRIMARY_L0.has(acronym) ? 'input' : 'aux');
const skip = new Set(['JobOrder.xml', 'runtime_config.txt', '.processing_dir']);

/**
 * Index every file under `dir` (recursive — the HPC archive is partitioned
 * as inputs/<L0|AUXS>/<type>/<delivery>/<yyyy>/<mm>/<dd>/) by basename.
 */
function indexDataDir(dir) {
  const byName = new Map();
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!e.name.endsWith('.md5')) {
        const arr = byName.get(e.name) ?? [];
        if (arr.length === 0) byName.set(e.name, arr);
        arr.push(p);
      }
    }
  };
  walk(dir);
  return byName;
}

/**
 * Resolve one .lst entry against the data-dir index. Entries are ZIP wrapper
 * names; tolerate the archive being pre-extracted (stem.DBL/.HDR/.EEF) and
 * naming drift between the HPC wrapper (CR2_, milliseconds in validity
 * times) and the standard EE product name (CS_, no milliseconds).
 */
function resolveEntry(entry, byName) {
  const stem = entry.replace(/\.zip$/i, '');
  const stems = new Set([stem]);
  for (const s of [...stems]) {
    if (s.startsWith('CR2_')) stems.add(s.replace(/^CR2_/, 'CS_'));
    stems.add(s.replace(/(T\d{6})000(?=[_.]|$)/g, '$1'));
    if (s.startsWith('CR2_'))
      stems.add(
        s.replace(/^CR2_/, 'CS_').replace(/(T\d{6})000(?=[_.]|$)/g, '$1'),
      );
  }
  const hits = [];
  for (const [name, paths] of byName) {
    const base = name.replace(/\.(ZIP|zip|DBL|HDR|EEF)$/, '');
    if (stems.has(name) || stems.has(base)) hits.push(paths[0]);
  }
  return hits;
}

/**
 * Recursively unwrap the HPC packaging down to plain product files: the
 * CR2_*.ZIP wrapper holds a CS_*.TGZ/.TAR (which holds the .DBL/.HDR pair)
 * plus PDGS sidecars (.MD.XML/.QR.XML/.SI.XML) that processors never read.
 */
function expandArchives(paths, tmp) {
  const out = [];
  const queue = [...paths];
  while (queue.length > 0) {
    const p = queue.shift();
    let cmd = null;
    if (/\.zip$/i.test(p)) cmd = ['unzip', ['-o', '-qq', '-j', p, '-d']];
    else if (/\.(tgz|tar\.gz)$/i.test(p)) cmd = ['tar', ['-xzf', p, '-C']];
    else if (/\.tar$/i.test(p)) cmd = ['tar', ['-xf', p, '-C']];
    if (!cmd) {
      if (!/\.(MD|QR|SI)\.XML$/i.test(p)) out.push(p);
      continue;
    }
    const dest = mkdtempSync(join(tmp, 'x-'));
    const r = spawnSync(cmd[0], [...cmd[1], dest]);
    if (r.status !== 0)
      throw new Error(
        `${cmd[0]} failed for ${p}: ${r.stderr?.toString() ?? r.error}`,
      );
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const f = join(d, e.name);
        if (e.isDirectory()) walk(f);
        else queue.push(f);
      }
    };
    walk(dest);
  }
  return out;
}

// Build the ingest list: [{path, name}]
const tmp = lstFile ? mkdtempSync(join(tmpdir(), 'ingest-cryosat-')) : null;
let files;
if (wdDir) {
  files = readdirSync(wdDir)
    .filter((f) => !skip.has(f) && !f.startsWith('.'))
    .sort()
    .map((f) => ({ path: join(wdDir, f), name: f }));
} else {
  const entries = readFileSync(lstFile, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const byName = indexDataDir(dataDir);
  const missing = [];
  const resolved = [];
  for (const entry of entries) {
    const hits = resolveEntry(entry, byName);
    if (hits.length === 0) missing.push(entry);
    else resolved.push(...hits);
  }
  if (missing.length > 0)
    throw new Error(
      `listing entries not found in ${dataDir}:\n  ${missing.join('\n  ')}`,
    );
  files = expandArchives(resolved, tmp).map((p) => ({
    path: p,
    name: basename(p),
  }));
}

// A fresh prod DB may never have run the dev seed — create the Media row for
// the bucket instead of requiring it.
const media = await prisma.media.upsert({
  where: { name: BUCKET },
  update: {},
  create: { name: BUCKET, type: 'S3' },
});
const catalog = await prisma.mediaCatalog.upsert({
  where: { mediaId_name: { mediaId: media.id, name: 'CRYOSAT_TDS' } },
  update: {},
  create: { mediaId: media.id, name: 'CRYOSAT_TDS' },
});

const dataset = await (async () => {
  const existing = await prisma.dataset.findFirst({
    where: { name: datasetName },
  });
  return existing ?? prisma.dataset.create({ data: { name: datasetName } });
})();

const members = [];
for (const { path, name } of files) {
  const acronym = typeOf(name);
  if (!acronym) {
    console.warn(`skip (no EE type): ${name}`);
    continue;
  }
  const productType = await prisma.productType.upsert({
    where: { acronym },
    update: {},
    create: {
      acronym,
      name: acronym,
      category: 'StaticAux',
      processingLevel: '0',
    },
  });
  const existing = await prisma.product.findFirst({
    where: { name, version: null },
    include: { mediaCatalogEntries: { select: { mediaCatalogEntryId: true } } },
  });
  // Shared aux appear in nearly every listing — when the product already has
  // its catalog entry, the bytes are in S3: just reference it. (Uploading
  // unconditionally re-pushed ~90MB per list instead of the ~2.5MB L0.)
  if (existing && existing.mediaCatalogEntries.length > 0) {
    members.push({ productId: existing.id, role: roleOf(acronym) });
    console.log(`${roleOf(acronym).padEnd(5)} ${acronym}  ${name}  (cached)`);
    continue;
  }
  const product =
    existing ??
    (await prisma.product.create({
      data: { name, productTypeId: productType.id },
    }));
  const bytes = readFileSync(path);
  const key = `products/${product.id}/${name}`;
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes }),
  );
  const url = `s3://${BUCKET}/${key}`;
  const entry = await prisma.mediaCatalogEntry.upsert({
    where: { mediaCatalogId_path: { mediaCatalogId: catalog.id, path: url } },
    update: { size: BigInt(bytes.length) },
    create: {
      mediaCatalogId: catalog.id,
      path: url,
      size: BigInt(bytes.length),
    },
  });
  await prisma.productMediaCatalogEntry.upsert({
    where: {
      productId_mediaCatalogEntryId: {
        productId: product.id,
        mediaCatalogEntryId: entry.id,
      },
    },
    update: {},
    create: { productId: product.id, mediaCatalogEntryId: entry.id },
  });
  members.push({ productId: product.id, role: roleOf(acronym) });
  console.log(
    `${roleOf(acronym).padEnd(5)} ${acronym}  ${name}  (${bytes.length} bytes)`,
  );
}

// Rebuild the dataset membership from scratch: sequence is unique per
// (datasetId, role), so in-place role updates from a re-run would collide.
// Dedupe by product — several listing entries can resolve to the same file
// (open-validity aux shared across input sets) — and rebuild atomically so
// a failure never leaves the dataset emptied.
const seen = new Set();
const seqByRole = new Map();
const rows = [];
for (const { productId, role } of members) {
  if (seen.has(productId)) continue;
  seen.add(productId);
  const seq = seqByRole.get(role) ?? 0;
  seqByRole.set(role, seq + 1);
  rows.push({ datasetId: dataset.id, productId, role, sequence: seq });
}
await prisma.$transaction([
  prisma.datasetProduct.deleteMany({ where: { datasetId: dataset.id } }),
  prisma.datasetProduct.createMany({ data: rows }),
]);
console.log(`dataset ${datasetName} id=${dataset.id} products=${rows.length}`);
if (tmp) rmSync(tmp, { recursive: true, force: true });
await prisma.$disconnect();
