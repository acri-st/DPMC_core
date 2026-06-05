import {
  AddProcessingChainBodySchema,
  AddProcessingChainResponse201Schema,
  UpdateProcessingChainBodySchema,
  UpdateProcessingChainResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// POST /production-chain/:id/processing-chains
export class AddProcessingChainBody extends createZodDto(
  AddProcessingChainBodySchema,
) {}
export const AddProcessingChainResponseSchema =
  AddProcessingChainResponse201Schema;
export class AddProcessingChainResponse extends createZodDto(
  AddProcessingChainResponseSchema,
) {}

// PATCH /production-chain/:id/processing-chains/:pcId
export class UpdateProcessingChainBody extends createZodDto(
  UpdateProcessingChainBodySchema,
) {}
export const UpdateProcessingChainResponseSchema =
  UpdateProcessingChainResponse200Schema;
export class UpdateProcessingChainResponse extends createZodDto(
  UpdateProcessingChainResponseSchema,
) {}
