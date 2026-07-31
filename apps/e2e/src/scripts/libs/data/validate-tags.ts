import { REQUIREMENTS } from '../../../constants/requirements';
import { TEST_CASES } from '../../../constants/test-cases';
import type { TestTag } from './types';

/**
 * Guards the requirement mapping against the drift that produced the i0r2
 * figures: `@covers` tags had been assigned by test index rather than by the
 * requirement each test actually verifies, so T6 was shifted by one rank and
 * T12/T14 pointed at requirement ids that do not exist. Both failure modes are
 * silent — an unknown id simply covers nothing, and a shifted id credits the
 * wrong requirement — so coverage totals stayed plausible while being wrong.
 *
 * `test-cases.ts` is the authority: it carries the plan id, and the specs must
 * agree with it.
 */
export function validateTags(tags: TestTag[]): string[] {
  const known = new Set(REQUIREMENTS.map((r) => r.id));
  const expected = new Map(TEST_CASES.map((c) => [c.id, [...c.covers].sort()]));
  const errors: string[] = [];

  for (const tag of tags) {
    for (const id of tag.requirementIds) {
      if (!known.has(id)) {
        errors.push(`${tag.file}: @covers ${id} is not a requirement in requirements.ts`);
      }
    }
  }

  const seen = new Map<string, Set<string>>();
  for (const tag of tags) {
    for (const planId of tag.planIds) {
      const bucket = seen.get(planId) ?? new Set<string>();
      for (const id of tag.requirementIds) bucket.add(id);
      seen.set(planId, bucket);
    }
  }

  for (const [planId, actual] of seen) {
    const want = expected.get(planId);
    if (!want) {
      errors.push(`@plan ${planId} has no matching case in test-cases.ts`);
      continue;
    }
    const got = [...actual].sort();
    if (got.join(',') !== want.join(',')) {
      errors.push(
        `@plan ${planId}: specs cover [${got.join(', ')}] but test-cases.ts declares [${want.join(', ')}]`,
      );
    }
  }

  return errors;
}
