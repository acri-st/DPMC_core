import {
  AddEdgeRequestSchema,
  AddEdgeResponse201Schema,
  UpdateEdgeRequestSchema,
  UpdateEdgeResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// POST /production-chain/:id/edges
export const AddEdgeBodySchema = AddEdgeRequestSchema;
export class AddEdgeBody extends createZodDto(AddEdgeBodySchema) {}
export const AddEdgeResponseSchema = AddEdgeResponse201Schema;
export class AddEdgeResponse extends createZodDto(AddEdgeResponseSchema) {}

// PATCH /production-chain/:id/edges/:edgeId
export const UpdateEdgeBodySchema = UpdateEdgeRequestSchema;
export class UpdateEdgeBody extends createZodDto(UpdateEdgeBodySchema) {}
export const UpdateEdgeResponseSchema = UpdateEdgeResponse200Schema;
export class UpdateEdgeResponse extends createZodDto(
  UpdateEdgeResponseSchema,
) {}
