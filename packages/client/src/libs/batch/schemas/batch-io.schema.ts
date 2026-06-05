import { z } from 'zod';
import { IdSchema } from '../../_shared';
import { ProductSchema } from '../../product/schemas/product.schema';

/**
 * What the BatchDetailPage needs for the "Output" preview column: the
 * stored Product plus a short-lived signed URL the browser can hit
 * directly. `previewUrl` is null when the API can't sign (no S3 url on
 * the product yet, malformed url, etc.).
 */
export const BatchProductWithPreviewSchema = ProductSchema.extend({
  previewUrl: z.string().nullable(),
});
export type BatchProductWithPreview = z.infer<
  typeof BatchProductWithPreviewSchema
>;

/**
 * Resolved view of a single input Product consumed by a Batch. Each row
 * is one `DatasetProduct` of a Dataset linked through `BatchDatasetIn`,
 * carrying its role, product name and type acronym. The data itself is
 * retrieved by the processing script from the product's media graph, so no
 * flattened URL is exposed here.
 *
 * Note: `localName` is intentionally not exposed — it's a runtime stage-in
 * artifact derived by `WorkerService.deriveLocalName` from the chain's
 * `mode` and is not meaningful client-side.
 */
export const BatchInputEntrySchema = z.object({
  role: z.string(),
  productId: IdSchema,
  productName: z.string(),
  productType: z.string(),
});
export type BatchInputEntry = z.infer<typeof BatchInputEntrySchema>;
