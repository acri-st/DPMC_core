import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@dpmc/prisma';

import { PrismaService } from '@/core/prisma';

import type { CanonicalIR } from './canonical-ir';
import type { ChainIr } from './chain-ir';
import { EarthCAREAdapter } from './adapters/earthcare';
import { S3TTAdapter } from './adapters/s3';
import { parseIpfTaskTable } from './adapters/ipf';
import { TtParseError, type TtAdapter } from './adapters/base';
import { deserializeIr, serializeIr } from './task-table.utils';

const ADAPTERS: Record<string, () => TtAdapter> = {
  s3: () => new S3TTAdapter(),
  earthcare: () => new EarthCAREAdapter(),
};

@Injectable()
export class TaskTableService {
  constructor(private readonly prisma: PrismaService) {}

  async plan(
    adapter: string,
    content: string,
  ): Promise<{
    planId: number;
    summary: {
      adapter: string;
      acceptedCount: number;
      rejectedCount: number;
      ir: CanonicalIR;
    };
  }> {
    const factory = ADAPTERS[adapter];
    if (!factory) throw new BadRequestException(`Unknown adapter '${adapter}'`);
    let ir: CanonicalIR;
    try {
      ir = factory().parse(content);
    } catch (err) {
      throw new BadRequestException(
        `TT parse failed: ${(err as Error).message}`,
      );
    }
    const accepted = ir.executables.length;
    const row = await this.prisma.taskTableImportPlan.create({
      data: {
        adapter,
        content: serializeIr(ir),
        acceptedCount: accepted,
        rejectedCount: 0,
      },
    });
    return {
      planId: row.id,
      summary: { adapter, acceptedCount: accepted, rejectedCount: 0, ir },
    };
  }

  async commit(
    planId: number,
  ): Promise<{ scriptId: number; versionId: number; chainId: number }> {
    const plan = await this.prisma.taskTableImportPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException(`Plan ${planId} not found`);
    if (plan.committedAt)
      throw new BadRequestException(`Plan ${planId} already committed`);
    const ir = deserializeIr(plan.content);

    const result = await this.prisma.$transaction(async (tx) => {
      const script = await tx.processingScript.create({
        data: {
          name: ir.processingScript.name,
          acronym: ir.processingScript.acronym,
        },
      });
      const version = await tx.processingScriptVersion.create({
        data: {
          processingScriptId: script.id,
          version: ir.processingScriptVersion.version,
          runtime: ir.processingScriptVersion.runtime,
          imageUrl: ir.processingScriptVersion.imageUrl ?? null,
          imageTag: ir.processingScriptVersion.imageTag ?? null,
          requiredCpu: ir.processingScriptVersion.requiredCpu,
          requiredRam: ir.processingScriptVersion.requiredRam,
          requiredDisk: ir.processingScriptVersion.requiredDisk,
        },
      });
      for (const e of ir.executables) {
        await tx.processingScriptExecutable.create({
          data: {
            processingScriptVersionId: version.id,
            scriptType: e.scriptType,
            stage: e.stage,
            path: e.path,
            name: e.name,
            sequence: e.sequence,
            args: e.args ?? null,
          },
        });
      }
      await tx.taskTableImportPlan.update({
        where: { id: planId },
        data: { committedAt: new Date() },
      });

      return { scriptId: script.id, versionId: version.id, chainId: script.id };
    });
    return result;
  }

  /**
   * Pick a free chain name in the project by suffixing `(N)` until the
   * (projectId, name) tuple is unused. Lets users re-import the same TT
   * without hitting the `production_chain @@unique([projectId, name])`
   * constraint mid-transaction.
   */
  /**
   * Returns the next free `vN` label for a ProcessingScript so re-imports
   * never collide on `@@unique([processingScriptId, version])`. We don't
   * trust max(N)+1 alone — version labels can be arbitrary strings — so
   * we probe each candidate.
   */
  private async pickAvailableScriptVersion(
    tx: Prisma.TransactionClient,
    processingScriptId: number,
  ): Promise<string> {
    const existing = await tx.processingScriptVersion.findMany({
      where: { processingScriptId },
      select: { version: true },
    });
    const taken = new Set(existing.map((v) => v.version));
    for (let i = 1; i <= 1000; i++) {
      const candidate = `v${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    throw new BadRequestException(
      `Could not allocate a free version label for script ${processingScriptId}.`,
    );
  }

  private async pickAvailableChainName(
    tx: Prisma.TransactionClient,
    projectId: number,
    base: string,
  ): Promise<string> {
    for (let i = 1; i <= 50; i++) {
      const candidate = i === 1 ? base : `${base} (${i})`;
      const existing = await tx.productionChain.findFirst({
        where: { projectId, name: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    throw new BadRequestException(
      `Could not pick a free name for "${base}" — too many copies exist.`,
    );
  }

  /**
   * Dry-run parse used by the wizard's preview step: returns the IR so the
   * user can confirm nodes / edges / parameters before committing.
   */
  previewIpf(content: string): ChainIr {
    try {
      return parseIpfTaskTable(content);
    } catch (err) {
      if (err instanceof TtParseError) {
        throw new BadRequestException(`IPF TT parse failed: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Parse an IPF Task Table and materialize a full ProductionChain (with
   * one ProcessingScript per <Task>, edges inferred from File_Type / Output
   * Type matches, and Dyn_ProcParams surfaced as chain parameters).
   *
   * One-shot: parse + create in a single transaction so partial state
   * never lands in DB. Re-importable: ProcessingScript is upserted by
   * acronym so importing the same TT twice creates a fresh chain
   * pointing at the existing scripts rather than failing on the
   * `acronym @unique` constraint.
   */
  async createChainFromIpf(
    projectId: number,
    content: string,
  ): Promise<{
    chainId: number;
    nodeCount: number;
    edgeCount: number;
  }> {
    let ir: ChainIr;
    try {
      ir = parseIpfTaskTable(content);
    } catch (err) {
      if (err instanceof TtParseError) {
        throw new BadRequestException(`IPF TT parse failed: ${err.message}`);
      }
      throw err;
    }

    return this.prisma
      .$transaction(async (tx) => {
        const acronymToScript = new Map<
          string,
          { id: number; versionId: number }
        >();

        for (const node of ir.nodes) {
          const existingScript = await tx.processingScript.findUnique({
            where: { acronym: node.acronym },
            select: { id: true },
          });
          const script =
            existingScript ??
            (await tx.processingScript.create({
              data: { name: node.name, acronym: node.acronym },
            }));

          // ProcessingScriptVersion is @@unique([processingScriptId, version]).
          // Re-imports must pick a fresh label; count existing versions and
          // suffix accordingly so each import lands a v1/v2/v3/... cleanly.
          if (existingScript) {
            await tx.processingScriptVersion.updateMany({
              where: { processingScriptId: script.id, isLatest: true },
              data: { isLatest: false },
            });
          }
          const versionLabel = await this.pickAvailableScriptVersion(
            tx,
            script.id,
          );
          const version = await tx.processingScriptVersion.create({
            data: {
              processingScriptId: script.id,
              version: versionLabel,
              isLatest: true,
              runtime: node.runtime,
              imageUrl: node.imageUrl ?? null,
              imageTag: node.imageTag ?? null,
              requiredCpu: node.requiredCpu,
              requiredRam: BigInt(node.requiredRamBytes),
              requiredDisk: BigInt(node.requiredDiskBytes),
            },
          });
          await tx.processingScriptExecutable.create({
            data: {
              processingScriptVersionId: version.id,
              scriptType: node.scriptType,
              stage: node.stage,
              path: node.path,
              name: node.name,
              sequence: 0,
              args: node.args ?? null,
            },
          });
          // Always re-point the script's defaultVersion to the version we
          // just imported, so dispatch consumes the latest runtime/args
          // (otherwise re-imports would leave the chain wired to the very
          // first version forever).
          await tx.processingScript.update({
            where: { id: script.id },
            data: { defaultVersionId: version.id },
          });
          acronymToScript.set(node.acronym, {
            id: script.id,
            versionId: version.id,
          });
        }

        const chainName = await this.pickAvailableChainName(
          tx,
          projectId,
          ir.name,
        );
        const chain = await tx.productionChain.create({
          data: {
            projectId,
            name: chainName,
            comment: ir.comment ?? null,
            configuration: {
              parameters: ir.parameters,
              source: { adapter: 'ipf' },
            } as unknown as Prisma.InputJsonValue,
          },
        });

        const nodeRowByAcronym = new Map<string, { id: number }>();
        for (const node of ir.nodes) {
          const script = acronymToScript.get(node.acronym)!;
          const pc = await tx.processingChain.create({
            data: {
              productionChainId: chain.id,
              processingScriptId: script.id,
              name: node.acronym,
              configuration: {
                inputTypes: node.inputTypes,
                outputTypes: node.outputTypes,
              },
            },
          });
          nodeRowByAcronym.set(node.acronym, { id: pc.id });
        }
        for (const edge of ir.edges) {
          const parent = nodeRowByAcronym.get(edge.parentAcronym);
          const child = nodeRowByAcronym.get(edge.childAcronym);
          if (!parent || !child) continue;
          await tx.productionChainEdge.create({
            data: {
              productionChainId: chain.id,
              parentChainId: parent.id,
              childChainId: child.id,
            },
          });
        }

        return {
          chainId: chain.id,
          nodeCount: ir.nodes.length,
          edgeCount: ir.edges.length,
        };
      })
      .catch((err) => {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          const targetRaw = err.meta?.target;
          const target = Array.isArray(targetRaw)
            ? targetRaw.join(', ')
            : typeof targetRaw === 'string'
              ? targetRaw
              : null;
          const hint = target
            ? `unique on ${target}`
            : (err.message.split('\n').pop() ?? 'unique constraint');
          throw new ConflictException(
            `Import conflicts with existing data — ${hint}.`,
          );
        }
        throw err;
      });
  }
}
