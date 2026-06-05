import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  listProductTypes,
  type ListProductTypesParams,
} from '@/features/product-type/services/product-type.service';

export const PRODUCT_TYPE_LIST_BASE_KEY = ['product-type', 'list'] as const;
export const productTypeListKey = (params: ListProductTypesParams) =>
  [
    ...PRODUCT_TYPE_LIST_BASE_KEY,
    params.page,
    params.pageSize,
    params.q ?? '',
  ] as const;

export function useProductTypeList(params: ListProductTypesParams) {
  const { status } = useCurrentUser();
  return useQuery({
    queryKey: productTypeListKey(params),
    queryFn: () => listProductTypes(params),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
  });
}
