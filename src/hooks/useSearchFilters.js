// src/hooks/useSearchFilters.js
// Filtros da página Explorar guardados no endereço (?q=…&categoria=arte&zona=sul…): a
// Descobrir abre o mapa já filtrado, recarregar mantém os filtros e o link pode ser
// compartilhado. Cada mudança substitui a entrada do histórico, sem empilhar cliques.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, filtersFromUrl, filtersToUrl } from '../services/searchFilters';

// Uso: const { filters, setFilters, clearFilters } = useSearchFilters();
//      setFilters((current) => ({ ...current, free: true }));
export default function useSearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.toString();
  // A mesma URL devolve o mesmo objeto, para não refazer consultas à toa.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => filtersFromUrl(searchParams), [query]);

  const setFilters = useCallback(
    (next) =>
      setSearchParams(
        (current) => filtersToUrl(typeof next === 'function' ? next(filtersFromUrl(current)) : next),
        { replace: true },
      ),
    [setSearchParams],
  );

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), [setFilters]);

  return { filters, setFilters, clearFilters };
}
