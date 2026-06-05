import type { PriorityClass } from '@dpmc/client';

export const CLASS_WEIGHTS: Record<PriorityClass, number> = {
  Test: 0.5,
  OnDemand: 1,
  Reprocessing: 1.2,
  NRT: 5,
  Super: 100,
  Ultra: 1000,
};

export const AGING_COEF = 0.01;
export const AGING_CAP_S = 86_400; // 24h

export interface EffectivePriorityInput {
  priority: number;
  priorityClass: PriorityClass;
  projectWeight: number;
  readySince: Date;
  now: Date;
}

export function effectivePriority(input: EffectivePriorityInput): number {
  const ageS = Math.max(
    0,
    (input.now.getTime() - input.readySince.getTime()) / 1000,
  );
  const aging = AGING_COEF * Math.min(ageS, AGING_CAP_S);
  return (
    input.priority * CLASS_WEIGHTS[input.priorityClass] * input.projectWeight +
    aging
  );
}
