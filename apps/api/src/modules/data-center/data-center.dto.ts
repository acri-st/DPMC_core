import {
  GetDataCenterResponse200Schema,
  ListDataCenterResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

// GET /data-center
export const ListDataCenterResponseSchema = ListDataCenterResponse200Schema;
export class ListDataCenterResponse extends createZodDto(
  ListDataCenterResponseSchema,
) {}

// GET /data-center/:id
export const GetDataCenterResponseSchema = GetDataCenterResponse200Schema;
export class GetDataCenterResponse extends createZodDto(
  GetDataCenterResponseSchema,
) {}
