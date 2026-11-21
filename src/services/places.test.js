import { LatLngBounds } from 'leaflet';
import { describe, expect, it, vi } from 'vitest';
import api from './api';
import {
  fetchDiscoverPlaces,
  fetchFilterOptions,
  fetchNearbyPlaces,
  fetchPlaceDetail,
  fetchPlacesInBounds,
  placePath,
  toBoundsParams,
} from './places';

const bounds = (south, west, north, east) => new LatLngBounds([south, west], [north, east]);

describe('toBoundsParams', () => {
  it('converte os limites do Leaflet nos parâmetros do backend, com 5 casas decimais', () => {
    expect(toBoundsParams(bounds(-23.6123456, -46.7123456, -23.5, -46.6))).toEqual({
      sw_lat: -23.61235,
      sw_lng: -46.71235,
      ne_lat: -23.5,
      ne_lng: -46.6,
    });
  });

  it('limita latitude e longitude aos intervalos aceitos pelo backend', () => {
    expect(toBoundsParams(bounds(-95, -185, 95, -100))).toEqual({
      sw_lat: -90,
      sw_lng: -180,
      ne_lat: 90,
      ne_lng: -100,
    });
  });

  it('retorna null para uma área vazia (ex.: mapa ainda sem tamanho)', () => {
    expect(toBoundsParams(bounds(-23.55, -46.63, -23.55, -46.63))).toBeNull();
  });

  it('retorna null para 180° ou mais de longitude, que o backend rejeita', () => {
    expect(toBoundsParams(bounds(-23.6, -120, -23.5, 60))).toBeNull();
  });
});

describe('fetchPlacesInBounds', () => {
  const params = { sw_lat: -23.6, sw_lng: -46.7, ne_lat: -23.5, ne_lng: -46.6 };

  it('consulta GET /api/search com os limites e o sinal de cancelamento', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const { signal } = new AbortController();
    await fetchPlacesInBounds(params, { signal });
    expect(get).toHaveBeenCalledWith('/api/search', {
      params,
      paramsSerializer: { indexes: null },
      signal,
    });
  });

  it('envia os filtros ativos junto com a área', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const filters = {
      q: ' museu ',
      categories: ['arte', 'musica'],
      regions: ['Sul'],
      free: true,
      maxPrice: 40,
    };
    await fetchPlacesInBounds(params, { filters });
    expect(get.mock.calls[0][1].params).toEqual({
      ...params,
      q: 'museu',
      categories: ['arte', 'musica'],
      regions: ['Sul'],
      is_free: true,
      max_price: 40,
    });
  });

  it('repete as listas sem colchetes, como o backend espera', () => {
    const query = api.getUri({
      url: '/api/search',
      params: { categories: ['arte', 'musica'] },
      paramsSerializer: { indexes: null },
    });
    expect(query).toContain('categories=arte&categories=musica');
  });

  it('converte GeoJSON [lng, lat] em pinos [lat, lng] e descarta lugares sem coordenadas', async () => {
    const badges = { is_free: true };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        {
          id: 'mapas_saas:space:31',
          name: 'Museu',
          primary_category: 'Museu',
          location: { type: 'Point', coordinates: [-46.63, -23.55] },
          badges,
        },
        { id: 'sem-categoria', name: 'Praça', location: { coordinates: [-46.64, -23.56] } },
        { id: 'sem-local', name: 'Sem local', location: null },
      ],
    });
    expect(await fetchPlacesInBounds(params)).toEqual([
      {
        id: 'mapas_saas:space:31',
        name: 'Museu',
        category: 'Museu',
        position: [-23.55, -46.63],
        neighborhood: null,
        summary: null,
        badges,
      },
      {
        id: 'sem-categoria',
        name: 'Praça',
        category: null,
        position: [-23.56, -46.64],
        neighborhood: null,
        summary: null,
        badges: {},
      },
    ]);
  });

  it('retorna lista vazia quando a resposta não é uma lista', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { detail: 'inesperado' } });
    expect(await fetchPlacesInBounds(params)).toEqual([]);
  });

  it('propaga o erro da API para quem chamou', async () => {
    const failure = new Error('falhou');
    vi.spyOn(api, 'get').mockRejectedValue(failure);
    await expect(fetchPlacesInBounds(params)).rejects.toBe(failure);
  });
});

describe('fetchPlaceDetail', () => {
  it('consulta GET /api/places/{id} com o id codificado e devolve o JSON do backend', async () => {
    const detail = { id: 'mapas_saas:space:31', name: 'Museu' };
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: detail });
    const { signal } = new AbortController();
    await expect(fetchPlaceDetail('mapas_saas:space:31', { signal })).resolves.toBe(detail);
    expect(get).toHaveBeenCalledWith('/api/places/mapas_saas%3Aspace%3A31', { signal });
  });
});

describe('placePath', () => {
  it('monta o caminho da página do lugar com o id codificado', () => {
    expect(placePath('mapas_saas:space:31')).toBe('/lugar/mapas_saas%3Aspace%3A31');
  });
});

describe('fetchDiscoverPlaces', () => {
  it('consulta GET /api/search/discover e converte cada espaço em card', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        {
          id: 'a',
          name: 'Casa A',
          primary_category: 'Casa de Cultura',
          location: { type: 'Point', coordinates: [-46.7, -23.5] },
          badges: { hidden_gem: true },
          neighborhood: 'Butantã',
          short_description: 'Oficinas.',
        },
        { id: 'b', name: 'Casa B' },
      ],
    });
    const { signal } = new AbortController();
    await expect(fetchDiscoverPlaces({ signal })).resolves.toEqual([
      {
        id: 'a',
        name: 'Casa A',
        category: 'Casa de Cultura',
        neighborhood: 'Butantã',
        summary: 'Oficinas.',
        badges: { hidden_gem: true },
      },
      { id: 'b', name: 'Casa B', category: null, neighborhood: null, summary: null, badges: {} },
    ]);
    expect(get).toHaveBeenCalledWith('/api/search/discover', { signal });
  });

  it('devolve lista vazia para respostas inesperadas', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null });
    await expect(fetchDiscoverPlaces()).resolves.toEqual([]);
  });
});

describe('fetchNearbyPlaces', () => {
  it('consulta GET /api/search com o raio em km e traz bairro e resumo de cada pino', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        {
          id: 'perto',
          name: 'Casa Perto',
          primary_category: 'Teatro',
          location: { type: 'Point', coordinates: [-46.65, -23.56] },
          badges: { is_free: true },
          neighborhood: 'Bela Vista',
          short_description: 'Peças aos sábados.',
        },
        { id: 'sem-local', name: 'Sem local', location: null },
      ],
    });
    const { signal } = new AbortController();

    const places = await fetchNearbyPlaces({ lat: -23.5, lng: -46.6, radiusKm: 2 }, { signal });

    expect(get).toHaveBeenCalledWith('/api/search', {
      params: { lat: -23.5, lng: -46.6, radius_km: 2 },
      paramsSerializer: { indexes: null },
      signal,
    });
    expect(places).toEqual([
      {
        id: 'perto',
        name: 'Casa Perto',
        category: 'Teatro',
        position: [-23.56, -46.65],
        neighborhood: 'Bela Vista',
        summary: 'Peças aos sábados.',
        badges: { is_free: true },
      },
    ]);
  });

  it('combina o raio com os filtros', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const filters = { q: '', categories: [], regions: [], free: true, maxPrice: null };
    await fetchNearbyPlaces({ lat: -23.5, lng: -46.6, radiusKm: 1 }, { filters });
    expect(get.mock.calls[0][1].params).toEqual({
      lat: -23.5,
      lng: -46.6,
      radius_km: 1,
      is_free: true,
    });
  });

  it('retorna lista vazia quando a resposta não é uma lista', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null });
    await expect(fetchNearbyPlaces({ lat: 0, lng: 0, radiusKm: 1 })).resolves.toEqual([]);
  });
});

describe('fetchFilterOptions', () => {
  it('consulta GET /api/search/filters e descarta grupos malformados', async () => {
    const arte = { id: 'arte', label: 'Arte e Cultura', count: 3 };
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: { groups: [arte, { id: 'sem-contagem', label: 'X' }, null], priced_places: 12 },
    });
    const { signal } = new AbortController();
    await expect(fetchFilterOptions({ signal })).resolves.toEqual({
      groups: [arte],
      pricedPlaces: 12,
    });
    expect(get).toHaveBeenCalledWith('/api/search/filters', { signal });
  });

  it('sem resposta válida, não há grupos nem preços conhecidos', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    await expect(fetchFilterOptions()).resolves.toEqual({ groups: [], pricedPlaces: 0 });
  });
});
