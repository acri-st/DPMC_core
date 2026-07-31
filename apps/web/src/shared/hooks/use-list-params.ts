import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

type UseListParamsOptions = {
  /** Names of the multi-select filters this list supports. */
  filterKeys: string[];
  defaultPageSize?: number;
};

export type SortOrder = 'asc' | 'desc';

export function useListParams({
  filterKeys,
  defaultPageSize = 25,
}: UseListParamsOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [q, setQ] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(filterKeys.map((k) => [k, []])),
  );

  const debouncedQ = useDebouncedValue(q, 300);
  const trimmedQ = debouncedQ.trim();

  const sortEntry = sorting[0];
  const sort = sortEntry?.id;
  const order: SortOrder | undefined = sortEntry
    ? sortEntry.desc
      ? 'desc'
      : 'asc'
    : undefined;

  // Any change to the result set (search, filters, sort) resets to page 1.
  const filterSignature = filterKeys
    .map((k) => filters[k]?.join(',') ?? '')
    .join('|');
  // `q` (not the debounced `trimmedQ`) drives the reset so the page snaps
  // back to 1 as soon as the user types, without waiting on the debounce.
  useEffect(() => {
    setPage(1);
  }, [q, filterSignature, sort, order]);

  const setFilter = (key: string, values: string[]) =>
    setFilters((prev) => ({ ...prev, [key]: values }));

  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return useMemo(
    () => ({
      page,
      pageSize,
      q,
      trimmedQ,
      sorting,
      filters,
      sort,
      order,
      setPage,
      setPageSize: changePageSize,
      setQ,
      setSorting,
      setFilter,
    }),
    [page, pageSize, q, trimmedQ, sorting, filters, sort, order],
  );
}
