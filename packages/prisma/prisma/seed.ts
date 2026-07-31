import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/client.js';
import {
  seedDataCenters,
  seedPools,
  seedProcessingScripts,
  seedDefaultProject,
  seedProductionChains,
  seedProducts,
  seedSources,
} from '../src/seed/index.js';
import { runStep, header, done, fail } from '../src/utils/index.js';

const SEED_HISTORICAL_PRODUCTS = process.env.SEED_HISTORICAL_PRODUCTS === 'true';

(async () => {
  const startedAt = Date.now();
  header('Seeding database');

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await runStep('DataCenters', () => seedDataCenters(prisma));
    await runStep('Pools', () => seedPools(prisma));
    await runStep('ProcessingScripts', () => seedProcessingScripts(prisma));
    await runStep('Project', () => seedDefaultProject(prisma));
    await runStep('ProductionChains', () => seedProductionChains(prisma));
    await runStep('Sources', (progress) => seedSources(prisma, progress));

    if (SEED_HISTORICAL_PRODUCTS) {
      await runStep('Products', (progress) => seedProducts(prisma, progress));
    }
    done(Date.now() - startedAt);
  } catch (err) {
    fail(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
