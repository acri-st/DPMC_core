import { StatusResponse200Schema } from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// /status
export const StatusResponseSchema = StatusResponse200Schema;
export class StatusResponse extends createZodDto(StatusResponseSchema) {}
