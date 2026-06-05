import type { Prisma } from '@dpmc/prisma';

type Json = Record<string, unknown>;

/**
 * Merge parameter sources with precedence (lowest → highest):
 *   defaults < chainCfg < taskParams < parentParams
 *
 * Used to compute `Batch.parametersIn` at planning time (expand) and at
 * fan-out time (expandFanOut, where `parentParams` carries the per-block
 * payload from the upstream calc batch's `parametersOut`).
 */
export function mergeParametersIn(sources: {
  defaults?: Json;
  chainCfg?: Json;
  taskParams?: Json;
  parentParams?: Json;
}): Json {
  return {
    ...(sources.defaults ?? {}),
    ...(sources.chainCfg ?? {}),
    ...(sources.taskParams ?? {}),
    ...(sources.parentParams ?? {}),
  };
}

/**
 * Read the parameter defaults declared on a ProductionChain.
 * Used by both expand() (planning) and expandFanOut() (runtime fan-out).
 */
export async function loadChainParamDefaults(
  tx: Prisma.TransactionClient,
  productionChainId: number,
): Promise<Json> {
  const params = await tx.productionChainParameter.findMany({
    where: { productionChainId },
    select: { name: true, defaultValue: true },
  });
  return Object.fromEntries(
    params
      .filter((p) => p.defaultValue !== null)
      .map((p) => [p.name, p.defaultValue as unknown]),
  );
}
