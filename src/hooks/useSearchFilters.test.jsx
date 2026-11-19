import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import useSearchFilters from './useSearchFilters';

function renderAt(path) {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  return renderHook(() => ({ ...useSearchFilters(), location: useLocation() }), { wrapper });
}

describe('useSearchFilters', () => {
  it('lê os filtros do endereço', () => {
    const { result } = renderAt('/explorar?categoria=arte&zona=sul&gratis=1');
    expect(result.current.filters).toEqual({
      q: '',
      categories: ['arte'],
      regions: ['Sul'],
      free: true,
      maxPrice: null,
    });
  });

  it('mantém o mesmo objeto enquanto o endereço não muda', () => {
    const { result, rerender } = renderAt('/explorar?categoria=arte');
    const first = result.current.filters;
    rerender();
    expect(result.current.filters).toBe(first);
  });

  it('grava as mudanças no endereço e limpa tudo', () => {
    const { result } = renderAt('/explorar?zona=sul');
    act(() => result.current.setFilters((current) => ({ ...current, maxPrice: 20 })));
    expect(result.current.location.search).toBe('?zona=sul&ate=20');
    expect(result.current.filters.maxPrice).toBe(20);

    act(() => result.current.clearFilters());
    expect(result.current.location.search).toBe('');
    expect(result.current.filters.regions).toEqual([]);
  });
});
