// src/services/places.js
// Consulta dos pinos do mapa: GET /api/places, filtrado pela área visível (DA04/DA05).
// O backend já devolve apenas lugares publicados e com coordenadas válidas.
import api from './api';

const COORDINATE_DECIMALS = 5; // ~1 m: evita requisições repetidas por ruído de ponto flutuante.

function round(value) {
  const factor = 10 ** COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

function clamp(value, limit) {
  return Math.min(Math.max(value, -limit), limit);
}

// Converte os limites do Leaflet (LatLngBounds) nos parâmetros aceitos pelo backend.
// Retorna null quando a área é inválida para o backend (vazia, ou com 180° ou mais de
// longitude), caso em que a consulta não deve ser feita.
export function toBoundsParams(bounds) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const params = {
    sw_lat: round(clamp(sw.lat, 90)),
    sw_lng: round(clamp(sw.lng, 180)),
    ne_lat: round(clamp(ne.lat, 90)),
    ne_lng: round(clamp(ne.lng, 180)),
  };
  const isEmpty = params.sw_lat >= params.ne_lat || params.sw_lng >= params.ne_lng;
  const isTooWide = params.ne_lng - params.sw_lng >= 180;
  return isEmpty || isTooWide ? null : params;
}

// GeoJSON guarda [longitude, latitude]; o Leaflet usa [latitude, longitude].
function toPin(place) {
  const [lng, lat] = place.location?.coordinates ?? [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: place.id,
    name: place.name,
    category: place.primary_category ?? null,
    position: [lat, lng],
    badges: place.badges ?? {},
  };
}

export async function fetchPlacesInBounds(boundsParams, { signal } = {}) {
  const { data } = await api.get('/api/places', { params: boundsParams, signal });
  return Array.isArray(data) ? data.map(toPin).filter(Boolean) : [];
}
