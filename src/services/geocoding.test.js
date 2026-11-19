import { describe, expect, it, vi } from 'vitest';
import api from './api';
import { geocodeAddress } from './geocoding';

describe('geocodeAddress', () => {
  it('consulta GET /api/search/geocode e devolve posições [lat, lng]', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        { label: 'Rua dos Pinheiros', neighborhood: 'Pinheiros', lat: -23.56, lng: -46.68 },
        { label: 'MASP', lat: -23.56, lng: -46.65 },
        { label: 'Sem coordenada', lat: null, lng: -46.6 },
      ],
    });
    const { signal } = new AbortController();

    const matches = await geocodeAddress('pinheiros', { signal });

    expect(get).toHaveBeenCalledWith('/api/search/geocode', {
      params: { q: 'pinheiros' },
      signal,
    });
    expect(matches).toEqual([
      { label: 'Rua dos Pinheiros', neighborhood: 'Pinheiros', position: [-23.56, -46.68] },
      { label: 'MASP', neighborhood: null, position: [-23.56, -46.65] },
    ]);
  });

  it('retorna lista vazia quando a resposta não é uma lista', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { detail: 'x' } });
    await expect(geocodeAddress('masp')).resolves.toEqual([]);
  });
});
