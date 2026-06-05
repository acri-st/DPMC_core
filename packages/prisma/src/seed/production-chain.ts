import { Prisma, type PrismaClient } from '../../dist/client.js';
import { productionChains } from '../constants/index.js';
import { SEED_PROJECT_IDENTIFIER } from './project.js';

async function buildScriptIndex(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  const scripts = await prisma.processingScript.findMany({
    select: { id: true, acronym: true },
  });
  return new Map(scripts.map((s) => [s.acronym, s.id]));
}

export async function seedProductionChains(prisma: PrismaClient) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { identifier: SEED_PROJECT_IDENTIFIER },
  });
  const projectId = project.id;
  const scriptByAcronym = await buildScriptIndex(prisma);
  const items: string[] = [];

  for (const { edges, configuration, nodes, ...chainData } of productionChains) {
    const pc = await prisma.productionChain.upsert({
      where: { projectId_name: { projectId, name: chainData.name } },
      update: { ...chainData, configuration: configuration ?? null },
      create: { projectId, ...chainData, configuration: configuration ?? null },
    });

    const usedAcronyms = new Set<string>();
    for (const e of edges) {
      usedAcronyms.add(e.parent);
      usedAcronyms.add(e.child);
    }

    type NodeSpec = {
      name: string;
      configuration?: Prisma.InputJsonValue;
      outputs?: ReadonlyArray<{
        role: string;
        localName: string;
        contentType: string;
        productTypeAcronym: string;
      }>;
    };
    const nodeByName = new Map<string, NodeSpec>(
      ((nodes ?? []) as ReadonlyArray<NodeSpec>).map((n) => [n.name, n]),
    );

    // Remove stale edges then stale chains
    await prisma.productionChainEdge.deleteMany({ where: { productionChainId: pc.id } });
    await prisma.processingChain.deleteMany({
      where: {
        productionChainId: pc.id,
        name: { notIn: [...usedAcronyms] },
      },
    });

    // Upsert one ProcessingChain per script acronym
    const processingChainByAcronym = new Map<string, string>();
    for (const acronym of usedAcronyms) {
      const scriptId = scriptByAcronym.get(acronym);
      if (!scriptId) {
        throw new Error(
          `ProductionChain ${chainData.name} references unknown script ${acronym}`,
        );
      }
      const nodeSpec = nodeByName.get(acronym);
      const nodeConfiguration: Prisma.InputJsonValue | typeof Prisma.DbNull =
        nodeSpec?.configuration !== undefined
          ? nodeSpec.configuration
          : Prisma.DbNull;
      const nodeOutputs: Prisma.InputJsonValue | typeof Prisma.DbNull =
        nodeSpec?.outputs !== undefined
          ? (nodeSpec.outputs as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull;
      const pcNode = await prisma.processingChain.upsert({
        where: { productionChainId_name: { productionChainId: pc.id, name: acronym } },
        update: {
          processingScriptId: scriptId,
          configuration: nodeConfiguration,
          outputs: nodeOutputs,
        },
        create: {
          productionChainId: pc.id,
          processingScriptId: scriptId,
          name: acronym,
          configuration: nodeConfiguration,
          outputs: nodeOutputs,
        },
      });
      processingChainByAcronym.set(acronym, pcNode.id);
    }

    // Recreate edges
    for (const e of edges) {
      const parentChainId = processingChainByAcronym.get(e.parent);
      const childChainId = processingChainByAcronym.get(e.child);
      if (!parentChainId || !childChainId) {
        throw new Error(`Edge ${e.parent} -> ${e.child} could not be resolved`);
      }
      await prisma.productionChainEdge.create({
        data: { productionChainId: pc.id, parentChainId, childChainId, dependencyMode: e.dependencyMode, isFanOut: e.isFanOut ?? false },
      });
    }

    items.push(`${chainData.name} (${edges.length} edges)`);
  }

  return { count: items.length, items };
}
