import { describe, expect, it, vi } from 'vitest';
import api from './api';
import { addFavoritePlace, fetchFavorites, removeFavoritePlace } from './favorites';

describe('services/favorites', () => {
  it('fetchFavorites consulta GET /api/users/me/favorites e normaliza os lugares', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        {
          id: 'mapas_saas:space:31',
          name: 'Casa de Cultura do Butantã',
          primary_category: 'Casa de Cultura',
          badges: { is_free: true },
        },
        { id: 'b', name: 'Museu B' },
      ],
    });
    const { signal } = new AbortController();

    await expect(fetchFavorites({ signal })).resolves.toEqual([
      {
        id: 'mapas_saas:space:31',
        name: 'Casa de Cultura do Butantã',
        category: 'Casa de Cultura',
        neighborhood: null,
        summary: null,
        badges: { is_free: true },
      },
      {
        id: 'b',
        name: 'Museu B',
        category: null,
        neighborhood: null,
        summary: null,
        badges: {},
      },
    ]);
    expect(get).toHaveBeenCalledWith('/api/users/me/favorites', { signal });
  });

  it('fetchFavorites devolve lista vazia quando a resposta não é um array', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null });
    await expect(fetchFavorites()).resolves.toEqual([]);
  });

  it('addFavoritePlace envia POST /api/users/me/favorites/{place_id} com id codificado', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        id: 'mapas_saas:space:31',
        name: 'Casa de Cultura do Butantã',
        primary_category: 'Casa de Cultura',
        badges: { hidden_gem: true },
      },
    });
    const { signal } = new AbortController();

    await expect(addFavoritePlace('mapas_saas:space:31', { signal })).resolves.toEqual({
      id: 'mapas_saas:space:31',
      name: 'Casa de Cultura do Butantã',
      category: 'Casa de Cultura',
      neighborhood: null,
      summary: null,
      badges: { hidden_gem: true },
    });
    expect(post).toHaveBeenCalledWith(
      '/api/users/me/favorites/mapas_saas%3Aspace%3A31',
      null,
      { signal },
    );
  });

  it('removeFavoritePlace envia DELETE /api/users/me/favorites/{place_id} com id codificado', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: null });
    const { signal } = new AbortController();

    await removeFavoritePlace('mapas_saas:space:31', { signal });
    expect(del).toHaveBeenCalledWith('/api/users/me/favorites/mapas_saas%3Aspace%3A31', {
      signal,
    });
  });
});
