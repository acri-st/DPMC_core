import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useListParams } from './use-list-params';

describe('useListParams', () => {
  it('resets page to 1 when a filter changes', () => {
    const { result } = renderHook(() =>
      useListParams({ filterKeys: ['status'] }),
    );

    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);

    act(() => result.current.setFilter('status', ['Running']));
    expect(result.current.page).toBe(1);
    expect(result.current.filters.status).toEqual(['Running']);
  });

  it('resets page to 1 when the search query changes', () => {
    const { result } = renderHook(() => useListParams({ filterKeys: [] }));
    act(() => result.current.setPage(3));
    act(() => result.current.setQ('abc'));
    expect(result.current.page).toBe(1);
  });

  it('exposes sort/order derived from the first sorting entry', () => {
    const { result } = renderHook(() => useListParams({ filterKeys: [] }));
    act(() => result.current.setSorting([{ id: 'priority', desc: true }]));
    expect(result.current.sort).toBe('priority');
    expect(result.current.order).toBe('desc');
    expect(result.current.page).toBe(1);
  });
});
