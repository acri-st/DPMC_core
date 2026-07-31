import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  MediaType,
  ProductTypeCategory,
  ProductionMode,
  type PrismaClient,
} from '../../dist/client.js';
import type { Progress } from '../utils/index.js';

const SEED_FILE_BASE = '../../data/seed';

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function ensureBucket(s3: S3Client, bucket: string): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

type ProductSeed = {
  name: string;
  file: string;
  contentType: string;
};

type ProductFamilySeed = {
  acronym: string;
  typeName: string;
  category: ProductTypeCategory;
  processingLevel?: string;
  catalogName: string;
  /** When set, gather the family's products into a Dataset of this name. */
  datasetName?: string;
  products: ProductSeed[];
};

const DPMC_TST_RE =
  /^DPMC_TST_([A-Z0-9_]{4})_(\d{8}T\d{6})_(\d{8}T\d{6})_(\d{8}T\d{6})\.txt$/;

function parseDpmcTstFile(basename: string): { typeCode: string } | null {
  const m = basename.match(DPMC_TST_RE);
  if (!m) return null;
  return { typeCode: m[1] };
}

function dpmcTstCategory(typeCode: string): ProductTypeCategory {
  if (typeCode === 'L0__' || typeCode === 'L1__' || typeCode === 'L2__') {
    return ProductTypeCategory.Measurement;
  }
  return ProductTypeCategory.StaticAux;
}

function dpmcTstProcessingLevel(typeCode: string): string | null {
  // Numeric processing levels (UI prefixes the "L"). Auxiliary data files
  // (ADF) carry no processing level → empty string (rendered as "—").
  if (typeCode === 'L0__') return '0';
  if (typeCode === 'L1__') return '1';
  if (typeCode === 'L2__') return '2';
  if (typeCode.startsWith('ADF')) return '';
  return null;
}

const PRODUCT_FAMILIES: ProductFamilySeed[] = [
  {
    // Level-0 (raw) satellite images. A Warhol chain run lifts them to L1
    // (see WorkerService.recordOutputs / incrementProcessingLevel).
    acronym: 'WARHOL_SAT_L0',
    typeName: 'Warhol satellite image (L0)',
    category: ProductTypeCategory.Measurement,
    processingLevel: '0',
    catalogName: 'WARHOL_SAT',
    datasetName: 'WARHOL_SAT_L0_DATASET',
    products: [
      {
        name: 'WARHOL_SAT_L0_FRANCE',
        file: 'WARHOL_SAT_FRANCE.png',
        contentType: 'image/png',
      },
      {
        name: 'WARHOL_SAT_L0_UK',
        file: 'WARHOL_SAT_UK.png',
        contentType: 'image/png',
      },
      {
        name: 'WARHOL_SAT_L0_ITALY',
        file: 'WARHOL_SAT_ITALY.png',
        contentType: 'image/png',
      },
      {
        name: 'WARHOL_SAT_L0_SPAIN',
        file: 'WARHOL_SAT_SPAIN.png',
        contentType: 'image/png',
      },
      {
        name: 'WARHOL_SAT_L0_DEUTSHLAND',
        file: 'WARHOL_SAT_DEUTSHLAND.png',
        contentType: 'image/png',
      },
    ],
  },
  // CryoSat Ocean Baseline-D L0 inputs — one placeholder product per
  // instrument mode. Gathered below into CRYOSAT_GOP_L0_DATASET (a family
  // datasetName can't be used: the dataset spans three product types).
  {
    acronym: 'SIR1LRM_0_',
    typeName: 'CryoSat SIRAL L0 (LRM)',
    category: ProductTypeCategory.Measurement,
    processingLevel: '0',
    catalogName: 'CRYOSAT_OCEAN',
    products: [
      {
        name: 'CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001.DBL',
        file: 'CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001.DBL',
        contentType: 'application/octet-stream',
      },
    ],
  },
  {
    acronym: 'SIR1SAR_0_',
    typeName: 'CryoSat SIRAL L0 (SAR)',
    category: ProductTypeCategory.Measurement,
    processingLevel: '0',
    catalogName: 'CRYOSAT_OCEAN',
    products: [
      {
        name: 'CS_OPER_SIR1SAR_0__20220102T084024_20220102T084445_0001.DBL',
        file: 'CS_OPER_SIR1SAR_0__20220102T084024_20220102T084445_0001.DBL',
        contentType: 'application/octet-stream',
      },
    ],
  },
  {
    acronym: 'SIR1SIN_0_',
    typeName: 'CryoSat SIRAL L0 (SARIn)',
    category: ProductTypeCategory.Measurement,
    processingLevel: '0',
    catalogName: 'CRYOSAT_OCEAN',
    products: [
      {
        name: 'CS_OPER_SIR1SIN_0__20220102T084024_20220102T084445_0001.DBL',
        file: 'CS_OPER_SIR1SIN_0__20220102T084024_20220102T084445_0001.DBL',
        contentType: 'application/octet-stream',
      },
    ],
  },
];

/** The CryoSat Ocean GOP chain's entry nodes all consume this dataset; each
 * generated job order picks its own File_Types out of it. */
const CRYOSAT_GOP_L0_DATASET = 'CRYOSAT_GOP_L0_DATASET';
const CRYOSAT_GOP_L0_NAMES = [
  'CS_OPER_SIR1LRM_0__20220102T084024_20220102T084445_0001.DBL',
  'CS_OPER_SIR1SAR_0__20220102T084024_20220102T084445_0001.DBL',
  'CS_OPER_SIR1SIN_0__20220102T084024_20220102T084445_0001.DBL',
];

export async function seedSources(
  prisma: PrismaClient,
  progress?: Progress,
): Promise<{ count: number; items: string[] }> {
  const bucket = readEnv('S3_BUCKET');
  const endpoint = readEnv('S3_ENDPOINT');
  const region = process.env.S3_REGION ?? 'us-east-1';
  const accessKey = readEnv('S3_ACCESS_KEY');
  const secretKey = readEnv('S3_SECRET_KEY');
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true';

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle,
  });

  await ensureBucket(s3, bucket);

  const media = await prisma.media.upsert({
    where: { name: bucket },
    update: {},
    create: { name: bucket, type: MediaType.S3 },
  });

  const items: string[] = [];
  // Live counter for the spinner (see runStep). The cryosat listings below are
  // the bulk of the S3 work (~1.4k objects); a per-object tick gives visible
  // progress instead of a silent multi-second stall.
  let uploaded = 0;

  for (const family of PRODUCT_FAMILIES) {
    const productType = await prisma.productType.upsert({
      where: { acronym: family.acronym },
      update: {
        name: family.typeName,
        category: family.category,
        processingLevel: family.processingLevel ?? '0',
      },
      create: {
        acronym: family.acronym,
        name: family.typeName,
        category: family.category,
        processingLevel: family.processingLevel ?? '0',
      },
    });

    const catalog = await prisma.mediaCatalog.upsert({
      where: { mediaId_name: { mediaId: media.id, name: family.catalogName } },
      update: {},
      create: { mediaId: media.id, name: family.catalogName },
    });

    const familyProductIds: number[] = [];
    for (const p of family.products) {
      const filePath = resolve(process.cwd(), SEED_FILE_BASE, p.file);
      const bytes = readFileSync(filePath);

      const product = await prisma.product.upsert({
        where: { name_version: { name: p.name, version: '' } },
        update: { productTypeId: productType.id },
        create: { name: p.name, productTypeId: productType.id },
        select: { id: true },
      });
      const productId = product.id;
      const key = `products/${productId}/${p.name}`;
      const s3Url = `s3://${bucket}/${key}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: p.contentType,
        }),
      );
      progress?.update(++uploaded);

      const entry = await prisma.mediaCatalogEntry.upsert({
        where: {
          mediaCatalogId_path: { mediaCatalogId: catalog.id, path: s3Url },
        },
        update: { size: BigInt(bytes.length) },
        create: {
          mediaCatalogId: catalog.id,
          path: s3Url,
          size: BigInt(bytes.length),
        },
      });

      await prisma.productMediaCatalogEntry.upsert({
        where: {
          productId_mediaCatalogEntryId: {
            productId,
            mediaCatalogEntryId: entry.id,
          },
        },
        update: {},
        create: { productId, mediaCatalogEntryId: entry.id },
      });

      familyProductIds.push(productId);
      items.push(`${p.name} → ${s3Url}`);
    }

    // Gather the family's products into a named Dataset (idempotent by name)
    // so it can be submitted to a production chain as a multi-product input.
    if (family.datasetName && familyProductIds.length > 0) {
      const existingDs = await prisma.dataset.findFirst({
        where: { name: family.datasetName },
        select: { id: true },
      });
      const datasetId =
        existingDs?.id ??
        (
          await prisma.dataset.create({
            data: { name: family.datasetName },
            select: { id: true },
          })
        ).id;
      for (let i = 0; i < familyProductIds.length; i++) {
        await prisma.datasetProduct.upsert({
          where: {
            datasetId_productId: { datasetId, productId: familyProductIds[i] },
          },
          update: {},
          create: {
            datasetId,
            productId: familyProductIds[i],
            role: 'input',
            sequence: i,
          },
        });
      }
    }
  }

  // Multi-type dataset gathering the three CryoSat GOP L0 placeholders.
  const gopProducts = await prisma.product.findMany({
    where: { name: { in: CRYOSAT_GOP_L0_NAMES } },
    select: { id: true },
    orderBy: { name: 'asc' },
  });
  if (gopProducts.length > 0) {
    const existingDs = await prisma.dataset.findFirst({
      where: { name: CRYOSAT_GOP_L0_DATASET },
      select: { id: true },
    });
    const datasetId =
      existingDs?.id ??
      (
        await prisma.dataset.create({
          data: { name: CRYOSAT_GOP_L0_DATASET },
          select: { id: true },
        })
      ).id;
    for (let i = 0; i < gopProducts.length; i++) {
      await prisma.datasetProduct.upsert({
        where: {
          datasetId_productId: { datasetId, productId: gopProducts[i].id },
        },
        update: {},
        create: {
          datasetId,
          productId: gopProducts[i].id,
          role: 'input',
          sequence: i,
        },
      });
    }
    items.push(`${CRYOSAT_GOP_L0_DATASET} (${gopProducts.length} products)`);
  }

  // Dynamic DPMC_TST products — generated by scripts/dpmc_tst.sh
  const dpmcFiles = readdirSync(resolve(process.cwd(), SEED_FILE_BASE)).filter(
    (f) =>
      f.startsWith('DPMC_TST_') &&
      f.endsWith('.txt') &&
      parseDpmcTstFile(f) !== null,
  );

  const dpmcByType = new Map<string, string[]>();
  for (const f of dpmcFiles) {
    const parsed = parseDpmcTstFile(f)!;
    const key = `DPMC_TST_${parsed.typeCode}`;
    if (!dpmcByType.has(key)) dpmcByType.set(key, []);
    dpmcByType.get(key)!.push(f);
  }

  if (dpmcByType.size > 0) {
    const dpmcCatalog = await prisma.mediaCatalog.upsert({
      where: { mediaId_name: { mediaId: media.id, name: 'DPMC_TST' } },
      update: {},
      create: { mediaId: media.id, name: 'DPMC_TST' },
    });

    for (const [acronym, files] of dpmcByType) {
      const typeCode = acronym.slice(9);
      const category = dpmcTstCategory(typeCode);
      const productType = await prisma.productType.upsert({
        where: { acronym },
        update: {
          name: acronym,
          category,
          processingLevel: dpmcTstProcessingLevel(typeCode) ?? '0',
        },
        create: {
          acronym,
          name: acronym,
          category,
          processingLevel: dpmcTstProcessingLevel(typeCode) ?? '0',
        },
      });

      for (const filename of files) {
        const filePath = resolve(process.cwd(), SEED_FILE_BASE, filename);
        const bytes = readFileSync(filePath);

        const product = await prisma.product.upsert({
          where: { name_version: { name: filename, version: '' } },
          update: { productTypeId: productType.id },
          create: { name: filename, productTypeId: productType.id },
          select: { id: true },
        });
        const productId = product.id;
        const key = `products/${productId}/${filename}`;
        const s3Url = `s3://${bucket}/${key}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: 'text/plain',
          }),
        );
        progress?.update(++uploaded);

        const entry = await prisma.mediaCatalogEntry.upsert({
          where: {
            mediaCatalogId_path: {
              mediaCatalogId: dpmcCatalog.id,
              path: s3Url,
            },
          },
          update: { size: BigInt(bytes.length) },
          create: {
            mediaCatalogId: dpmcCatalog.id,
            path: s3Url,
            size: BigInt(bytes.length),
          },
        });

        await prisma.productMediaCatalogEntry.upsert({
          where: {
            productId_mediaCatalogEntryId: {
              productId,
              mediaCatalogEntryId: entry.id,
            },
          },
          update: {},
          create: { productId, mediaCatalogEntryId: entry.id },
        });

        items.push(`${filename} → ${s3Url}`);
      }
    }
  }

  // CryoSat .lst manifests → raw S3 objects under `cryosat-listings/<file>`.
  // These are NOT Products (nothing stages them in): cryosat_hpc.py reads one at
  // runtime via its `listPath` param (s3://<bucket>/cryosat-listings/<file>) with
  // SigV4 auth. The dir is gitignored and may be absent (CI) → guard on existence.
  const listingsDir = resolve(
    process.cwd(),
    SEED_FILE_BASE,
    'cryosat_listings',
  );
  if (existsSync(listingsDir)) {
    const listings = readdirSync(listingsDir).filter((f) => f.endsWith('.lst'));
    // Now that the heavy batch size is known, publish a total so the spinner
    // switches from a bare count to a "n/total (pct%)" bar for the .lst upload.
    progress?.setTotal(uploaded + listings.length);
    for (const filename of listings) {
      const bytes = readFileSync(resolve(listingsDir, filename));
      const key = `cryosat-listings/${filename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: 'text/plain',
        }),
      );
      progress?.update(++uploaded);
    }
    if (listings.length > 0) {
      items.push(
        `${listings.length} CryoSat .lst → s3://${bucket}/cryosat-listings/`,
      );
    }
  }

  // Link Warhol production chain to WARHOL_SAT_L0 product type
  const warholChain = await prisma.productionChain.findFirst({
    where: { name: 'Warhol', deletedAt: null },
    select: { id: true },
  });
  const warholProductType = await prisma.productType.findUnique({
    where: { acronym: 'WARHOL_SAT_L0' },
    select: { id: true },
  });
  if (warholChain && warholProductType) {
    await prisma.productionChainProductType.upsert({
      where: {
        productionChainId_productTypeId: {
          productionChainId: warholChain.id,
          productTypeId: warholProductType.id,
        },
      },
      update: {},
      create: {
        productionChainId: warholChain.id,
        productTypeId: warholProductType.id,
      },
    });
  }

  const dpmcChain = await prisma.productionChain.findFirst({
    where: { name: 'DPMC_TST', deletedAt: null },
    select: { id: true },
  });
  const dpmcL0Type = await prisma.productType.findUnique({
    where: { acronym: 'DPMC_TST_L0__' },
    select: { id: true },
  });
  if (dpmcChain && dpmcL0Type) {
    await prisma.productionChainProductType.upsert({
      where: {
        productionChainId_productTypeId: {
          productionChainId: dpmcChain.id,
          productTypeId: dpmcL0Type.id,
        },
      },
      update: {},
      create: {
        productionChainId: dpmcChain.id,
        productTypeId: dpmcL0Type.id,
      },
    });
  }

  // Seed ProductIngestionHooks: trigger task creation when these product types are ingested
  const defaultProject = await prisma.project.findFirst({
    where: { identifier: 'dpmc-default' },
    select: { id: true },
  });

  if (defaultProject) {
    if (warholChain && warholProductType) {
      await prisma.productIngestionHook.upsert({
        where: {
          productTypeId_productionChainId: {
            productTypeId: warholProductType.id,
            productionChainId: warholChain.id,
          },
        },
        update: {},
        create: {
          productTypeId: warholProductType.id,
          productionChainId: warholChain.id,
          projectId: defaultProject.id,
          productionMode: ProductionMode.Generic,
          enabled: true,
        },
      });
    }

    if (dpmcChain && dpmcL0Type) {
      await prisma.productIngestionHook.upsert({
        where: {
          productTypeId_productionChainId: {
            productTypeId: dpmcL0Type.id,
            productionChainId: dpmcChain.id,
          },
        },
        update: {},
        create: {
          productTypeId: dpmcL0Type.id,
          productionChainId: dpmcChain.id,
          projectId: defaultProject.id,
          productionMode: ProductionMode.Reprocessing,
          enabled: true,
        },
      });
    }
  }

  return { count: items.length, items };
}
