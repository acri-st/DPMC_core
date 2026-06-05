import type { PrismaClient } from "../../dist/client.js";

const POOLS = [
  { name: "general", comment: "Polyvalent small machines" },
  { name: "compute", comment: "Large machines dedicated to intensive compute" },
];

export async function seedPools(prisma: PrismaClient) {
  const items: string[] = [];
  for (const pool of POOLS) {
    await prisma.pool.upsert({
      where: { name: pool.name },
      update: { comment: pool.comment },
      create: pool,
    });
    items.push(pool.name);
  }
  return { count: items.length, items };
}
