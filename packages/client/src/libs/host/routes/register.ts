import { z } from 'zod';
import {
  ApiResponseSchema,
  Error401Schema,
  Error404Schema,
  Error500Schema,
} from '@/schemas';
import { METHODS, PATHS } from '@/constants';
import { HostSchema, OsTypeSchema, SchedulingPrioritySchema } from '../schemas';
import { ContainerRuntimeSchema } from '../../processing-script/schemas';

export const RegisterHostBodySchema = z.object({
  dataCenterCode: z.string().min(1),
  hostname: z.string().min(1),
  ipAddress: z.string().min(1),
  osType: OsTypeSchema,
  osVersion: z.string().min(1),
  processingDir: z.string().min(1),
  cacheDir: z.string().min(1),
  nbCores: z.coerce.number().int().positive(),
  ram: z.union([z.number(), z.bigint(), z.string()]),
  disk: z.union([z.number(), z.bigint(), z.string()]),
  schedulingPriority: SchedulingPrioritySchema.optional().default('Medium'),
  hasGpu: z.boolean().optional().default(false),
  gpuCount: z.coerce.number().int().nonnegative().optional().default(0),
  gpuModel: z.string().nullable().optional(),
  containerRuntime: ContainerRuntimeSchema.optional().default('None'),
});

export type RegisterHostBody = z.infer<typeof RegisterHostBodySchema>;

export const RegisterHostResponse200Schema = ApiResponseSchema.extend({
  data: HostSchema,
});

export const RegisterHostResponse401Schema = Error401Schema;
export const RegisterHostResponse404Schema = Error404Schema;
export const RegisterHostResponse500Schema = Error500Schema;

export type RegisterHostResponse200 = z.infer<
  typeof RegisterHostResponse200Schema
>;
export type RegisterHostResponse401 = z.infer<
  typeof RegisterHostResponse401Schema
>;
export type RegisterHostResponse404 = z.infer<
  typeof RegisterHostResponse404Schema
>;
export type RegisterHostResponse500 = z.infer<
  typeof RegisterHostResponse500Schema
>;
export type RegisterHostResponse =
  | RegisterHostResponse200
  | RegisterHostResponse401
  | RegisterHostResponse404
  | RegisterHostResponse500;

export const RegisterHostRoute = {
  method: METHODS.POST,
  path: PATHS.HOST.REGISTER,
  body: RegisterHostBodySchema,
  responses: {
    200: RegisterHostResponse200Schema,
    401: RegisterHostResponse401Schema,
    404: RegisterHostResponse404Schema,
    500: RegisterHostResponse500Schema,
  },
};
