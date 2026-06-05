import { ProductTypeSchema, type ProductType } from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductTypeSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductTypeSchema,
});

export type ListProductTypesParams = {
  page: number;
  pageSize: number;
  q?: string;
};
export type ListProductTypesResult = { items: ProductType[]; total: number };

export async function listProductTypes(
  params: ListProductTypesParams,
): Promise<ListProductTypesResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/product-type?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return {
    items: parsed.data,
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function getProductType(id: string): Promise<ProductType> {
  const raw = await apiFetch<unknown>(`/product-type/${id}`);
  return GetResponseSchema.parse(raw).data;
}
