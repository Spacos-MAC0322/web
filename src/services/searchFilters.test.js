import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  activeFilterCount,
  explorePath,
  filterParams,
  filtersFromUrl,
  filtersKey,
  filtersToUrl,
} from './searchFilters';

const FULL = {
  q: 'casa de cultura',
  categories: ['arte', 'musica'],
  regions: ['Sul', 'Leste'],
  free: true,
  maxPrice: 40,
};

describe('filtros da busca', () => {
  it('sem filtros não envia parâmetros nem conta filtros ativos', () => {
    expect(filterParams(EMPTY_FILTERS)).toEqual({});
    expect(filterParams()).toEqual({});
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('converte os filtros nos parâmetros do backend', () => {
    expect(filterParams({ ...FULL, q: '  teatro ' })).toEqual({
      q: 'teatro',
      categories: ['arte', 'musica'],
      regions: ['Sul', 'Leste'],
      is_free: true,
      max_price: 40,
    });
    expect(activeFilterCount(FULL)).toBe(7);
  });

  it('vai e volta pelo endereço da página', () => {
    const url = filtersToUrl(FULL);
    expect(url.toString()).toBe(
      'q=casa+de+cultura&categoria=arte&categoria=musica&zona=sul&zona=leste&gratis=1&ate=40',
    );
    expect(filtersFromUrl(url)).toEqual(FULL);
  });

  it('ignora valores desconhecidos ou repetidos no endereço', () => {
    const url = new URLSearchParams(
      'categoria=arte&categoria=arte&categoria=<script>&zona=Zona+Sul&zona=NORTE&gratis=sim&ate=55',
    );
    expect(filtersFromUrl(url)).toEqual({
      q: '',
      categories: ['arte'],
      regions: ['Norte'],
      free: false,
      maxPrice: null,
    });
  });

  it('limita o texto ao tamanho aceito pelo backend', () => {
    const url = new URLSearchParams({ q: 'a'.repeat(150) });
    expect(filtersFromUrl(url).q).toHaveLength(100);
  });

  it('gera a mesma chave para os mesmos filtros', () => {
    expect(filtersKey({ ...FULL })).toBe(filtersKey(FULL));
    expect(filtersKey(EMPTY_FILTERS)).toBe('');
  });

  it('monta links para a página Explorar já filtrada', () => {
    expect(explorePath()).toBe('/explorar');
    expect(explorePath({ categories: ['arte'] })).toBe('/explorar?categoria=arte');
    expect(explorePath({ free: true })).toBe('/explorar?gratis=1');
    expect(explorePath({ q: 'Mooca' })).toBe('/explorar?q=Mooca');
  });
});
