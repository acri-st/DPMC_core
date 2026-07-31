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
import {
  buildAcsChainPlan,
  CRYOSAT_STATIC_VOLUMES,
  type AcsChainPlan,
} from './adapters/acs';
import { TtParseError, type TtAdapter } from './adapters/base';
import { deserializeIr, serializeIr } from './task-table.utils';

export interface AcsImportOptions {
  installRoot?: string | null;
  chainName?: string;
  images?: Record<string, { imageUrl: string; imageTag?: string }>;
}

const ADAPTERS: Record<string, () => TtAdapter> = {
  s3: () => new S3TTAdapter(),
  earthcare: () => new EarthCAREAdapter(),
};

@Injectable()
export class TaskTableService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ingestion history, most recent first (EOCP-E9-03). */
  async history() {
    const rows = await this.prisma.taskTableImportPlan.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        adapter: true,
        sourceName: true,
        acceptedCount: true,
        rejectedCount: true,
        createdAt: true,
        committedAt: true,
        committedScriptId: true,
        committedVersionId: true,
      },
    });
    return rows.map(({ id, ...rest }) => ({ planId: id, ...rest }));
  }

  /** One history entry with the source document and the parsed IR. */
  async historyGet(planId: number) {
    const row = await this.prisma.taskTableImportPlan.findUnique({
      where: { id: planId },
    });
    if (!row) throw new NotFoundException(`Plan ${planId} not found`);
    return {
      planId: row.id,
      adapter: row.adapter,
      sourceName: row.sourceName,
      acceptedCount: row.acceptedCount,
      rejectedCount: row.rejectedCount,
      createdAt: row.createdAt,
      committedAt: row.committedAt,
      committedScriptId: row.committedScriptId,
      committedVersionId: row.committedVersionId,
      sourceContent: row.sourceContent,
      // Stored JSON-safe already; deserializing here would reintroduce the
      // BigInt fields that cannot be serialized back into the response.
      ir: row.content,
    };
  }

  async plan(
    adapter: string,
    content: string,
    sourceName?: string,
  ): Promise<{
    planId: number;
    summary: {
      adapter: string;
      acceptedCount: number;
      rejectedCount: number;
      ir: Prisma.InputJsonValue;
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
        sourceName: sourceName ?? null,
        sourceContent: content,
      },
    });
    return {
      // `ir` carries BigInt byte counts, which JSON.stringify throws on. The
      // response ships the same JSON-safe projection that is persisted.
      planId: row.id,
      summary: {
        adapter,
        acceptedCount: accepted,
        rejectedCount: 0,
        ir: serializeIr(ir),
      },
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
        data: {
          committedAt: new Date(),
          committedScriptId: script.id,
          committedVersionId: version.id,
        },
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
   * Dry-run parse of one or more old-ACS `<Task_Table>` documents (CryoSat
   * style) for the wizard's preview step: one node per table, cross-table
   * edges inferred from DB output/input type matches.
   */
  previewAcs(
    files: Array<{ name: string; content: string }>,
    options: AcsImportOptions = {},
  ): AcsChainPlan {
    try {
      return buildAcsChainPlan(files, { installRoot: options.installRoot });
    } catch (err) {
      if (err instanceof TtParseError) {
        throw new BadRequestException(`ACS TT parse failed: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Materialize a ProductionChain from one or more old-ACS task tables:
   * one ProcessingScript per table with the pools as sequenced executables,
   * the full transcription stored as the node's `configuration.taskTable`
   * (consumed by the job-order generator at dispatch time), node outputs
   * derived from DB destinations, and typed cross-table edges. Additive
   * next to {@link createChainFromIpf} — the Sentinel-style flow is
   * untouched.
   */
  async createChainFromAcs(
    projectId: number,
    files: Array<{ name: string; content: string }>,
    options: AcsImportOptions = {},
  ): Promise<{ chainId: number; nodeCount: number; edgeCount: number }> {
    const plan = this.previewAcs(files, options);

    return this.prisma
      .$transaction(async (tx) => {
        const scriptByAcronym = new Map<string, number>();
        for (const node of plan.nodes) {
          const existingScript = await tx.processingScript.findUnique({
            where: { acronym: node.acronym },
            select: { id: true },
          });
          const script =
            existingScript ??
            (await tx.processingScript.create({
              data: { name: node.acronym, acronym: node.acronym },
            }));
          if (existingScript) {
            await tx.processingScriptVersion.updateMany({
              where: { processingScriptId: script.id, isLatest: true },
              data: { isLatest: false },
            });
          }

          const taken = await tx.processingScriptVersion.findFirst({
            where: { processingScriptId: script.id, version: node.version },
            select: { id: true },
          });
          const versionLabel = taken
            ? await this.pickAvailableScriptVersion(tx, script.id)
            : node.version;

          const image = options.images?.[node.acronym];
          const version = await tx.processingScriptVersion.create({
            data: {
              processingScriptId: script.id,
              version: versionLabel,
              isLatest: true,
              runtime: 'Docker',
              imageUrl: image?.imageUrl ?? node.suggestedImageUrl,
              imageTag: image?.imageTag ?? 'development',
              requiredCpu: 1,
              requiredRam: 2n * 1024n * 1024n * 1024n,
              requiredDisk: BigInt(node.requiredDiskBytes),
            },
          });
          for (const exe of node.executables) {
            await tx.processingScriptExecutable.create({
              data: {
                processingScriptVersionId: version.id,
                scriptType: exe.scriptType,
                stage: exe.stage,
                path: exe.path,
                name: exe.name,
                sequence: exe.sequence,
              },
            });
          }
          await tx.processingScript.update({
            where: { id: script.id },
            data: { defaultVersionId: version.id },
          });
          scriptByAcronym.set(node.acronym, script.id);
        }

        const chainName = await this.pickAvailableChainName(
          tx,
          projectId,
          options.chainName ?? plan.name,
        );
        const chain = await tx.productionChain.create({
          data: {
            projectId,
            name: chainName,
            configuration: {
              source: {
                adapter: 'acs',
                files: plan.nodes.map((n) => n.sourceName),
              },
            },
          },
        });

        const nodeRowByAcronym = new Map<string, number>();
        for (const node of plan.nodes) {
          const pc = await tx.processingChain.create({
            data: {
              productionChainId: chain.id,
              processingScriptId: scriptByAcronym.get(node.acronym)!,
              name: node.acronym,
              configuration: {
                staticVolumes: CRYOSAT_STATIC_VOLUMES,
                taskTable: node.taskTable,
              } as unknown as Prisma.InputJsonValue,
              outputs: node.outputs,
            },
          });
          nodeRowByAcronym.set(node.acronym, pc.id);
        }
        for (const edge of plan.edges) {
          await tx.productionChainEdge.create({
            data: {
              productionChainId: chain.id,
              parentChainId: nodeRowByAcronym.get(edge.parentAcronym)!,
              childChainId: nodeRowByAcronym.get(edge.childAcronym)!,
              dependencyMode: edge.dependencyMode,
            },
          });
        }

        return {
          chainId: chain.id,
          nodeCount: plan.nodes.length,
          edgeCount: plan.edges.length,
        };
      })
      .catch((err) => {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException(
            'ACS import conflicts with existing data (unique constraint).',
          );
        }
        throw err;
      });
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
