import type { PrismaClient, Prisma } from "../../dist/client.js";
import { Client } from "pg";
import type { Progress } from "../utils/index.js";

const READ_BATCH_SIZE = 10_000;
const INSERT_BATCH_SIZE = 5_000;
const SAMPLE_NAMES_LIMIT = 8;

export async function seedProducts(prisma: PrismaClient, progress?: Progress) {
  const typeTable = process.env.PRODUCTS_TYPE_TABLE;
  const productTable = process.env.PRODUCTS_TABLE;

  if (!typeTable || !productTable) {
    throw new Error("PRODUCTS_TYPE_TABLE and PRODUCTS_TABLE must be set");
  }

  const client = new Client({
    connectionString: process.env.PRODUCTS_DATABASE_URL,
  });
  await client.connect();

  try {
    const { rows: typeRows } = await client.query<{ Id: string; Name: string }>(
      `SELECT * FROM "${typeTable}"`,
    );
    const productTypes: Prisma.ProductTypeCreateManyInput[] = typeRows.map(
      ({ Name }) => ({
        acronym: Name,
        name: Name,
      }),
    );

    // Product type ids are auto-increment integers assigned by the DB; insert
    // without ids, then read them back to map the external ProductType name to
    // the new integer id used as the product's foreign key.
    await prisma.productType.createMany({ data: productTypes, skipDuplicates: true });
    const persistedTypes = await prisma.productType.findMany({
      select: { id: true, name: true },
    });
    const productTypeMap = new Map(persistedTypes.map((pt) => [pt.name, pt.id]));

    const { rows: countRows } = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${productTable}"`,
    );
    const total = Number(countRows[0]?.count ?? 0);
    progress?.setTotal(total);
    progress?.update(0);

    const sampleNames: string[] = [];
    let inserted = 0;
    let pendingBatch: Prisma.ProductCreateManyInput[] = [];
    let lastId: string | null = null;

    const flush = async () => {
      if (pendingBatch.length === 0) return;
      await prisma.product.createMany({ data: pendingBatch, skipDuplicates: true });
      inserted += pendingBatch.length;
      progress?.update(inserted);
      pendingBatch = [];
    };

    while (true) {
      const query: string =
        lastId === null
          ? `SELECT "Id", "Name", "ProductType" FROM "${productTable}" ORDER BY "Id" ASC LIMIT $1`
          : `SELECT "Id", "Name", "ProductType" FROM "${productTable}" WHERE "Id" > $1 ORDER BY "Id" ASC LIMIT $2`;
      const params: unknown[] =
        lastId === null ? [READ_BATCH_SIZE] : [lastId, READ_BATCH_SIZE];

      const { rows } = await client.query<{ Id: string; Name: string; ProductType: string }>(
        query,
        params,
      );
      if (rows.length === 0) break;

      for (const { Name, ProductType } of rows) {
        const productTypeId = productTypeMap.get(ProductType);
        if (!productTypeId) {
          console.error(`ProductType ${ProductType} not found`);
          continue;
        }
        pendingBatch.push({ productTypeId, name: Name });
        if (sampleNames.length < SAMPLE_NAMES_LIMIT) sampleNames.push(Name);
        if (pendingBatch.length >= INSERT_BATCH_SIZE) await flush();
      }

      lastId = rows[rows.length - 1].Id;
      if (rows.length < READ_BATCH_SIZE) break;
    }

    await flush();

    return { count: inserted, items: sampleNames };
  } finally {
    await client.end();
  }
}
