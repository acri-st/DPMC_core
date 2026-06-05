import { ProductSchema, type Product } from '@dpmc/client';
import { z } from 'zod';

import { apiFetch, apiFetchWithMeta } from '@/shared/libs/api-client';

const ListResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductSchema.array(),
});

const GetResponseSchema = z.object({
  status: z.number(),
  success: z.string(),
  data: ProductSchema,
});

export type ListProductsParams = {
  page: number;
  pageSize: number;
  q?: string;
};

export type ListProductsResult = {
  items: Product[];
  total: number;
};

export async function listProducts(
  params: ListProductsParams,
): Promise<ListProductsResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  const { data, headers } = await apiFetchWithMeta<unknown>(
    `/product?${search.toString()}`,
  );
  const parsed = ListResponseSchema.parse(data);
  const totalHeader = headers.get('X-Total-Count');
  const total = totalHeader ? Number(totalHeader) : parsed.data.length;
  return { items: parsed.data, total: Number.isFinite(total) ? total : 0 };
}

export async function getProduct(id: string): Promise<Product> {
  const raw = await apiFetch<unknown>(`/product/${id}`);
  return GetResponseSchema.parse(raw).data;
}
