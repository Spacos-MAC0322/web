// src/services/favorites.js
// Acesso aos favoritos do usuário logado: GET /api/users/me/favorites,
// POST /api/users/me/favorites/{place_id} e DELETE /api/users/me/favorites/{place_id}.
import api from './api';

function toFavoritePlace(place) {
  return {
    id: place.id,
    name: place.name,
    category: place.primary_category ?? null,
    neighborhood: place.neighborhood ?? null,
    summary: place.short_description ?? null,
    badges: place.badges ?? {},
  };
}

export async function fetchFavorites({ signal } = {}) {
  const { data } = await api.get('/api/users/me/favorites', { signal });
  return Array.isArray(data) ? data.map(toFavoritePlace) : [];
}

export async function addFavoritePlace(placeId, { signal } = {}) {
  const { data } = await api.post(
    `/api/users/me/favorites/${encodeURIComponent(placeId)}`,
    null,
    { signal },
  );
  return toFavoritePlace(data);
}

export async function removeFavoritePlace(placeId, { signal } = {}) {
  await api.delete(`/api/users/me/favorites/${encodeURIComponent(placeId)}`, { signal });
}
