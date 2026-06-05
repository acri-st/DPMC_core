import {
  GetProcessingScriptResponse200Schema,
  ListProcessingScriptResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// GET /processing-script
export const ListProcessingScriptResponseSchema =
  ListProcessingScriptResponse200Schema;
export class ListProcessingScriptResponse extends createZodDto(
  ListProcessingScriptResponseSchema,
) {}

// GET /processing-script/:id
export const GetProcessingScriptResponseSchema =
  GetProcessingScriptResponse200Schema;
export class GetProcessingScriptResponse extends createZodDto(
  GetProcessingScriptResponseSchema,
) {}
