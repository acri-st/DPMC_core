import { ScriptStage, type PrismaClient } from "../../dist/client.js";
import { processingScripts } from "../constants/index.js";

export async function seedProcessingScripts(prisma: PrismaClient) {
  const items: string[] = [];

  for (const { versions, ...scriptData } of processingScripts) {
    const script = await prisma.processingScript.upsert({
      where: { acronym: scriptData.acronym },
      update: { name: scriptData.name },
      create: scriptData,
    });

    let defaultVersionId: string | null = null;

    for (const { executables, ...versionData } of versions) {
      const version = await prisma.processingScriptVersion.upsert({
        where: {
          processingScriptId_version: {
            processingScriptId: script.id,
            version: versionData.version,
          },
        },
        update: versionData,
        create: { ...versionData, processingScriptId: script.id },
      });

      if (versionData.isLatest && !defaultVersionId) {
        defaultVersionId = version.id;
      }

      for (const exe of executables) {
        const stage = exe.stage ?? ScriptStage.Exe;
        await prisma.processingScriptExecutable.upsert({
          where: {
            processingScriptVersionId_stage_sequence: {
              processingScriptVersionId: version.id,
              stage,
              sequence: exe.sequence,
            },
          },
          update: { ...exe, stage },
          create: { ...exe, stage, processingScriptVersionId: version.id },
        });
      }
    }

    if (defaultVersionId && script.defaultVersionId !== defaultVersionId) {
      await prisma.processingScript.update({
        where: { id: script.id },
        data: { defaultVersionId },
      });
    }

    items.push(scriptData.acronym);
  }

  return { count: items.length, items };
}
