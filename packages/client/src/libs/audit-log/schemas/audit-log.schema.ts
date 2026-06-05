import { z } from 'zod';
import { IdSchema } from '../../_shared';

export const AuditLogActorTypeSchema = z.enum([
  'User',
  'System',
  'Worker',
  'Orchestrator',
]);

export const AuditLogActionSchema = z.enum([
  'Create',
  'Update',
  'Delete',
  'StatusTransition',
  'Replay',
]);

export const AuditLogSchema = z.object({
  id: IdSchema,
  actorId: z.string().nullable(),
  actorType: AuditLogActorTypeSchema,
  action: AuditLogActionSchema,
  aggregateType: z.string(),
  aggregateId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
