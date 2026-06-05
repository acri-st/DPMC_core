import type { PrismaClient } from "../../dist/client.js";
import { centers } from "../constants/index.js";

export async function seedDataCenters(prisma: PrismaClient) {
  const items: string[] = [];
  for (const c of centers) {
    await prisma.dataCenter.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
    items.push(c.code);
  }
  return { count: items.length, items };
}
