// src/services/places.js
// Consulta dos espaços do mapa e da lista ao lado: GET /api/search, na área visível
// (DA04/DA05) ou num raio em volta de um ponto (issue #3), com os filtros de categoria,
// zona e preço (user story #6). O backend já devolve apenas lugares publicados e com
// coordenadas válidas.
import api from './api';
import { EMPTY_FILTERS, filterParams } from './searchFilters';

// Ids vêm do backend no formato "provedor:tipo:id" e precisam ser codificados na URL.
export function placePath(id) {
  return `/lugar/${encodeURIComponent(id)}`;
}

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
    neighborhood: place.neighborhood ?? null,
    summary: place.short_description ?? null,
    badges: place.badges ?? {},
  };
}

// Card da seleção "Fora do óbvio" (#52): textos curtos do espaço, sem coordenadas.
function toCard(place) {
  return {
    id: place.id,
    name: place.name,
    category: place.primary_category ?? null,
    neighborhood: place.neighborhood ?? null,
    summary: place.short_description ?? null,
    badges: place.badges ?? {},
  };
}

// Seleção "Fora do óbvio" (#53): espaços com curadoria positiva, já ordenados pelo backend
// alternando as zonas da cidade.
export async function fetchDiscoverPlaces({ signal } = {}) {
  const { data } = await api.get('/api/search/discover', { signal });
  return Array.isArray(data) ? data.map(toCard) : [];
}

// GET /api/search: `area` são os limites do mapa ou { lat, lng, radius_km }. Listas vão
// repetidas (categories=a&categories=b), como o FastAPI espera, sem colchetes.
async function searchPlaces(filters, area, { signal } = {}) {
  const { data } = await api.get('/api/search', {
    params: { ...filterParams(filters ?? EMPTY_FILTERS), ...area },
    paramsSerializer: { indexes: null },
    signal,
  });
  return Array.isArray(data) ? data.map(toPin).filter(Boolean) : [];
}

// Espaços da área visível do mapa que atendem aos filtros, em ordem alfabética.
export function fetchPlacesInBounds(boundsParams, { signal, filters } = {}) {
  return searchPlaces(filters, boundsParams, { signal });
}

// Espaços a até `radiusKm` de um ponto (issue #3) que atendem aos filtros, do mais
// próximo ao mais distante. Bairro e resumo aparecem na lista ao lado do mapa.
export function fetchNearbyPlaces({ lat, lng, radiusKm }, { signal, filters } = {}) {
  return searchPlaces(filters, { lat, lng, radius_km: radiusKm }, { signal });
}

// Espaços cujo nome, bairro, categoria ou região contém `query`, em ordem alfabética, em
// toda a cidade (sem área do mapa). Usado para adicionar paradas a um roteiro (#87).
export function fetchPlacesByText(query, { signal } = {}) {
  return searchPlaces({ ...EMPTY_FILTERS, q: query }, {}, { signal });
}

// Opções do painel de filtros: os grupos de "O que você quer ver?" com quantos espaços há
// em cada um e quantos espaços têm gratuidade ou preço conhecidos (`pricedPlaces`). Sem
// nenhum, os filtros de preço ficam escondidos: não teriam resultado.
export async function fetchFilterOptions({ signal } = {}) {
  const { data } = await api.get('/api/search/filters', { signal });
  const groups = Array.isArray(data?.groups)
    ? data.groups.filter((group) => typeof group?.id === 'string' && Number.isInteger(group.count))
    : [];
  const pricedPlaces = Number.isInteger(data?.priced_places) ? data.priced_places : 0;
  return { groups, pricedPlaces };
}

// Detalhes de um espaço, com curadoria e programação dos próximos 30 dias (issue #2).
// Um id inexistente rejeita com ApiError de status 404.
export async function fetchPlaceDetail(id, { signal } = {}) {
  const { data } = await api.get(`/api/places/${encodeURIComponent(id)}`, { signal });
  return data;
}
