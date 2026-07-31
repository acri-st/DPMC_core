import { z } from 'zod';
import { IdSchema } from '../../_shared';

// Script artifact type: what a ProcessingScriptVersion needs (OCI image / SIF).
// `Kubernetes` is intentionally absent — it is an execution capability of a
// host, never something a script requires. See HostContainerRuntimeSchema.
export const ContainerRuntimeSchema = z.enum(['Docker', 'Apptainer', 'None']);
export type ContainerRuntime = z.infer<typeof ContainerRuntimeSchema>;

export const ScriptStageSchema = z.enum(['Pre', 'Exe', 'Post']);
export type ScriptStage = z.infer<typeof ScriptStageSchema>;

export const ScriptTypeSchema = z.enum([
  'Bash',
  'Python',
  'Node',
  'Binary',
  'PgBash',
  'PlSql',
  'Sql',
]);
export type ScriptType = z.infer<typeof ScriptTypeSchema>;

export const ProcessingScriptSchema = z.object({
  id: IdSchema,
  name: z.string(),
  acronym: z.string(),
  defaultVersionId: IdSchema.nullable(),
});

export type ProcessingScript = z.infer<typeof ProcessingScriptSchema>;

// List rows carry a lightweight summary of the default version so the table
// can show its human version string (not the raw defaultVersionId).
export const ProcessingScriptListItemSchema = ProcessingScriptSchema.extend({
  defaultVersion: z
    .object({ id: IdSchema, version: z.string() })
    .nullable(),
});
export type ProcessingScriptListItem = z.infer<
  typeof ProcessingScriptListItemSchema
>;

export const ProcessingScriptVersionSchema = z.object({
  id: IdSchema,
  processingScriptId: IdSchema,
  version: z.string(),
  isLatest: z.boolean(),
  runtime: ContainerRuntimeSchema,
  imageUrl: z.string().nullable(),
  imageTag: z.string().nullable(),
  imageChecksum: z.string().nullable(),
  requiredCpu: z.number().int(),
  requiredRam: z.union([z.number(), z.bigint(), z.string()]),
  requiredDisk: z.union([z.number(), z.bigint(), z.string()]),
  requiresGpu: z.boolean(),
  gpuCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ProcessingScriptVersion = z.infer<
  typeof ProcessingScriptVersionSchema
>;

export const ProcessingScriptExecutableSchema = z.object({
  id: IdSchema,
  processingScriptVersionId: IdSchema,
  scriptType: ScriptTypeSchema,
  stage: ScriptStageSchema,
  path: z.string(),
  name: z.string(),
  sequence: z.number().int(),
  args: z.string().nullable(),
});
export type ProcessingScriptExecutable = z.infer<
  typeof ProcessingScriptExecutableSchema
>;

// A version with its executables inlined — used by the detail endpoint.
export const ProcessingScriptVersionWithExecutablesSchema =
  ProcessingScriptVersionSchema.extend({
    executables: ProcessingScriptExecutableSchema.array(),
  });
export type ProcessingScriptVersionWithExecutables = z.infer<
  typeof ProcessingScriptVersionWithExecutablesSchema
>;

// Full detail payload returned by GET /processing-script/:id.
export const ProcessingScriptDetailSchema = ProcessingScriptSchema.extend({
  versions: ProcessingScriptVersionWithExecutablesSchema.array(),
});
export type ProcessingScriptDetail = z.infer<
  typeof ProcessingScriptDetailSchema
>;
