import { REQUIREMENTS, type Requirement } from '../../../constants/requirements';
import type { EvolutionCoverage, TestTag } from '../data/types';

export function buildEocpReport(tags: TestTag[]) {
  const tagsByRequirement = indexTagsByRequirement(tags);

  const byEvolution = new Map<string, Requirement[]>();
  for (const requirement of REQUIREMENTS) {
    const bucket = byEvolution.get(requirement.evolution) ?? [];
    bucket.push(requirement);
    byEvolution.set(requirement.evolution, bucket);
  }

  const evolutions: EvolutionCoverage[] = [...byEvolution.entries()]
    .sort(([a], [b]) => evolutionNumber(a) - evolutionNumber(b))
    .map(([evolution, reqs]) => ({
      evolution,
      requirements: reqs.map((requirement) => ({
        requirement,
        tests: tagsByRequirement.get(requirement.id) ?? [],
      })),
    }));

  const covered = evolutions.reduce(
    (n, e) => n + e.requirements.filter((r) => r.tests.length > 0).length,
    0,
  );

  return {
    totals: {
      total: REQUIREMENTS.length,
      covered,
      notCovered: REQUIREMENTS.length - covered,
    },
    evolutions,
  };
}

function indexTagsByRequirement(tags: TestTag[]) {
  const index = new Map<string, TestTag[]>();
  for (const tag of tags) {
    if (tag.isTodo) continue; // todo placeholders don't cover anything
    for (const id of tag.requirementIds) {
      const bucket = index.get(id) ?? [];
      bucket.push(tag);
      index.set(id, bucket);
    }
  }
  return index;
}

function evolutionNumber(evolution: string) {
  return Number(evolution.slice(1));
}
