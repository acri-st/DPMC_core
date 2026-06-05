import { z } from 'zod';

export const BaseQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .refine(
      (val) => {
        if (val === undefined) return true;
        const num = Number(val);
        return num >= 1 && num <= 50;
      },
      { message: 'limit must be between 1 and 50' },
    )
    .optional()
    .default('20')
    .or(z.undefined()),
  cursor: z.string().optional().nullable(),
});

export const ApiResponseSchema = z.object({
  status: z.number(),
  success: z.enum(['OK', 'KO']),
  message: z.string(),
  cursor: z.string().nullable().optional(),
  next: z.string().nullable().optional(),
  total: z.number().nullable().optional(),
  count: z.number().optional(),
  data: z.any().optional(),
});

const makeErrorSchema = (status: number) =>
  ApiResponseSchema.extend({
    status: z.literal(status),
    success: z.literal('KO'),
    data: z.never().optional(),
  }).omit({ data: true });

export const Error400Schema = makeErrorSchema(400);
export const Error401Schema = makeErrorSchema(401);
export const Error403Schema = makeErrorSchema(403);
export const Error404Schema = makeErrorSchema(404);
export const Error409Schema = makeErrorSchema(409);
export const Error429Schema = makeErrorSchema(429);
export const Error500Schema = makeErrorSchema(500);

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type Error400Response = z.infer<typeof Error400Schema>;
export type Error401Response = z.infer<typeof Error401Schema>;
export type Error403Response = z.infer<typeof Error403Schema>;
export type Error404Response = z.infer<typeof Error404Schema>;
export type Error409Response = z.infer<typeof Error409Schema>;
export type Error429Response = z.infer<typeof Error429Schema>;
export type Error500Response = z.infer<typeof Error500Schema>;
