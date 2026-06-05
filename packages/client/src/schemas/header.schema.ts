import { z } from 'zod';

export const HeadersSchema = z.object({
  Authorization: z.string().regex(/^Bearer \w+$/),
});

export type Headers = z.infer<typeof HeadersSchema>;
