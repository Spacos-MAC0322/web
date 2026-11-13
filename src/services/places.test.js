import { LatLngBounds } from 'leaflet';
import { describe, expect, it, vi } from 'vitest';
import api from './api';
import { fetchPlacesInBounds, toBoundsParams } from './places';

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

  it('consulta GET /api/places com os limites e o sinal de cancelamento', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const { signal } = new AbortController();
    await fetchPlacesInBounds(params, { signal });
    expect(get).toHaveBeenCalledWith('/api/places', { params, signal });
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
        badges,
      },
      { id: 'sem-categoria', name: 'Praça', category: null, position: [-23.56, -46.64], badges: {} },
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
