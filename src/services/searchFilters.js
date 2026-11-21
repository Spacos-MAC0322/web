// src/services/searchFilters.js
// Filtros da busca de espaços (user story #6): o mesmo objeto alimenta a consulta
// GET /api/search e o endereço da página Explorar, para que a Descobrir possa abrir o
// mapa já filtrado (/explorar?categoria=arte) e um link filtrado possa ser compartilhado.
//
// filters: { q: string, categories: string[], regions: string[], free: boolean,
//            maxPrice: number | null }

export const ZONES = Object.freeze(['Centro', 'Norte', 'Sul', 'Leste', 'Oeste']);
export const PRICE_OPTIONS = Object.freeze([20, 40, 60]);

export const EMPTY_FILTERS = Object.freeze({
  q: '',
  categories: Object.freeze([]),
  regions: Object.freeze([]),
  free: false,
  maxPrice: null,
});

const GROUP_ID = /^[a-z][a-z-]{0,39}$/;
const MAX_QUERY_LENGTH = 100;

const unique = (values) => [...new Set(values)];

// Quantos filtros estão ativos (o texto conta como um), para o botão "Filtros (n)".
export function activeFilterCount(filters) {
  return (
    (filters.q.trim() ? 1 : 0) +
    filters.categories.length +
    filters.regions.length +
    (filters.free ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0)
  );
}

// Parâmetros de GET /api/search; campos vazios ficam de fora.
export function filterParams(filters = EMPTY_FILTERS) {
  const params = {};
  const q = filters.q.trim();
  if (q) params.q = q;
  if (filters.categories.length) params.categories = [...filters.categories];
  if (filters.regions.length) params.regions = [...filters.regions];
  if (filters.free) params.is_free = true;
  if (filters.maxPrice !== null) params.max_price = filters.maxPrice;
  return params;
}

function zoneFromUrl(value) {
  return ZONES.find((zone) => zone.toLowerCase() === value.toLowerCase()) ?? null;
}

// URLSearchParams → filtros. Valores desconhecidos são ignorados, não viram erro.
export function filtersFromUrl(searchParams) {
  const price = Number(searchParams.get('ate'));
  return {
    q: (searchParams.get('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    categories: unique(searchParams.getAll('categoria').filter((id) => GROUP_ID.test(id))),
    regions: unique(searchParams.getAll('zona').map(zoneFromUrl).filter(Boolean)),
    free: searchParams.get('gratis') === '1',
    maxPrice: PRICE_OPTIONS.includes(price) ? price : null,
  };
}

// Filtros → URLSearchParams, na mesma ordem sempre (o texto serve de chave estável).
export function filtersToUrl(filters) {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set('q', q);
  filters.categories.forEach((id) => params.append('categoria', id));
  filters.regions.forEach((zone) => params.append('zona', zone.toLowerCase()));
  if (filters.free) params.set('gratis', '1');
  if (filters.maxPrice !== null) params.set('ate', String(filters.maxPrice));
  return params;
}

// Chave estável dos filtros, para refazer consultas só quando eles mudam.
export const filtersKey = (filters) => filtersToUrl(filters).toString();

// Link para a página Explorar com filtros (usado pela Descobrir).
export function explorePath(partial = {}) {
  const query = filtersToUrl({ ...EMPTY_FILTERS, ...partial }).toString();
  return query ? `/explorar?${query}` : '/explorar';
}
