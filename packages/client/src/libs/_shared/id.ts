import { z } from 'zod';

/**
 * Integer primary/foreign key as it appears in JSON response and request bodies.
 * IDs are auto-increment integers (≥ 1) since the UUID → int migration.
 */
export const IdSchema = z.number().int().positive();
export type Id = z.infer<typeof IdSchema>;

/**
 * Same as {@link IdSchema} but for IDs that arrive as strings (URL query
 * parameters), coercing the string to an integer before validation.
 */
export const IdParamSchema = z.coerce.number().int().positive();
