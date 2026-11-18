// src/services/geocoding.js
// Busca de endereço da página Explorar (issue #3): GET /api/search/geocode. O backend
// consulta o Nominatim (OpenStreetMap) por nós (DA05) e devolve até 5 lugares distintos,
// do mais relevante ao menos relevante. Mais de um resultado: o usuário escolhe.
import api from './api';

function toMatch(result) {
  return {
    label: result.label,
    neighborhood: result.neighborhood ?? null,
    position: [result.lat, result.lng],
  };
}

export async function geocodeAddress(query, { signal } = {}) {
  const { data } = await api.get('/api/search/geocode', { params: { q: query }, signal });
  return Array.isArray(data)
    ? data
        .filter((result) => Number.isFinite(result?.lat) && Number.isFinite(result?.lng))
        .map(toMatch)
    : [];
}
