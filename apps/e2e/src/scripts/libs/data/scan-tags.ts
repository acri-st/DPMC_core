import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { TestTag } from './types';

const COVERS_RE = /@covers\s+(.*)/;
const PLAN_RE = /@plan\s+(.*)/;
const REQ_RE = /EOCP-E\d+-\d+/g;
const PLAN_ID_RE = /T\d+\.\d+[a-z]?/g;
const IT_RE = /(?:it|test)(\.\w+)?\(\s*['"`](.+?)['"`]/;
const DESCRIBE_RE = /describe\(\s*['"`](.+?)['"`]/;

export function scanTags(testsDir: string) {
  const files = walkSpecs(testsDir);
  return files.flatMap((absolute) => {
    const rel = relative(testsDir, absolute);
    return scanFile(rel, readFileSync(absolute, 'utf-8'));
  });
}

function walkSpecs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkSpecs(full));
    } else if (entry.endsWith('.e2e-spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

function scanFile(file: string, source: string) {
  const tags: TestTag[] = [];
  const describeStack: Array<{ name: string; depth: number }> = [];
  let pendingRequirements: string[] = [];
  let pendingPlanIds: string[] = [];

  for (const line of source.split('\n')) {
    const depth = countLeadingSpaces(line);
    while (
      describeStack.length > 0 &&
      depth <= describeStack[describeStack.length - 1].depth
    ) {
      describeStack.pop();
    }

    const describeMatch = line.match(DESCRIBE_RE);
    if (describeMatch) {
      describeStack.push({ name: describeMatch[1], depth });
      continue;
    }

    const coversMatch = line.match(COVERS_RE);
    if (coversMatch) {
      pendingRequirements = coversMatch[1].match(REQ_RE) ?? [];
      continue;
    }

    const planMatch = line.match(PLAN_RE);
    if (planMatch) {
      pendingPlanIds = planMatch[1].match(PLAN_ID_RE) ?? [];
      continue;
    }

    const itMatch = line.match(IT_RE);
    if (
      itMatch &&
      (pendingRequirements.length > 0 || pendingPlanIds.length > 0)
    ) {
      const modifier = itMatch[1];
      const isTodo = modifier === '.todo';
      tags.push({
        file,
        testName: itMatch[2],
        describePath: describeStack.map((d) => d.name),
        requirementIds: pendingRequirements,
        planIds: pendingPlanIds,
        isTodo,
      });
      pendingRequirements = [];
      pendingPlanIds = [];
    }
  }

  return tags;
}

function countLeadingSpaces(line: string) {
  const match = line.match(/^\s*/);
  return match ? match[0].length : 0;
}
