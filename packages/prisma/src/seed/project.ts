  import type { PrismaClient } from "../../dist/client.js";
  import { ProductionMode } from "../../dist/client.js";

  /** Upsert key; importers (e.g. production-chain seed) resolve the tenant with this. */
  export const SEED_PROJECT_IDENTIFIER = "dpmc-default";

  export async function seedDefaultProject(prisma: PrismaClient) {
    const row = {
      name: "DPMC Default",
      comment:"Default project created for seeding purposes",
      isActive: true,
      isDefault: true,
      priorityWeight: 1,
      allowedProductionModes: [
        ProductionMode.Nominal,
        ProductionMode.Generic,
        ProductionMode.OnDemand,
        ProductionMode.Reprocessing,
      ],
    };

    const project = await prisma.project.upsert({
      where: { identifier: SEED_PROJECT_IDENTIFIER },
      update: { ...row, deletedAt: null },
      create: { identifier: SEED_PROJECT_IDENTIFIER, ...row },
    });

    return { count: 1, items: [project.identifier] };
  }
