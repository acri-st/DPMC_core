import { Co2QuerySchema, Co2Response200Schema } from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export class Co2Query extends createZodDto(Co2QuerySchema) {}
export const Co2ResponseSchema = Co2Response200Schema;
export class Co2Response extends createZodDto(Co2ResponseSchema) {}
