import { Prisma } from '@dpmc/prisma';

import type { CanonicalIR } from './canonical-ir';

export const serializeIr = (ir: CanonicalIR): Prisma.InputJsonValue =>
  ({
    ...ir,
    processingScriptVersion: {
      ...ir.processingScriptVersion,
      requiredRam: ir.processingScriptVersion.requiredRam.toString(),
      requiredDisk: ir.processingScriptVersion.requiredDisk.toString(),
    },
  }) as unknown as Prisma.InputJsonValue;

export const deserializeIr = (value: unknown): CanonicalIR => {
  const v = value as any;
  return {
    ...v,
    processingScriptVersion: {
      ...v.processingScriptVersion,
      requiredRam: BigInt(v.processingScriptVersion.requiredRam),
      requiredDisk: BigInt(v.processingScriptVersion.requiredDisk),
    },
  };
};
