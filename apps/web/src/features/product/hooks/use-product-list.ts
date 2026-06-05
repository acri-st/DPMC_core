import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listProducts,
  type ListProductsParams,
} from '@/features/product/services/product.service';

export const productListKey = (params: ListProductsParams) =>
  ['product', 'list', params.page, params.pageSize, params.q ?? ''] as const;

export function useProductList(params: ListProductsParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: productListKey(params),
    queryFn: () => listProducts(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
