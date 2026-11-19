// src/services/geo.js
// Geografia compartilhada pelo mapa e pela busca por proximidade (issue #3): centro e
// limites do mapa, distância entre dois pontos e a forma de exibi-la.
// Posições seguem o Leaflet: [latitude, longitude].

export const SAO_PAULO_CENTER = [-23.5505, -46.6333];
// Região metropolitana com folga: impede que o mapa se perca longe da cidade. É a mesma
// área usada pelo backend na busca por endereço.
export const MAX_BOUNDS = [
  [-24.2, -47.2],
  [-23.1, -46.1],
];

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Distância em linha reta (fórmula de haversine), em quilômetros.
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function isInsideMapBounds([lat, lng]) {
  const [[south, west], [north, east]] = MAX_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

const kmFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

// "350 m" abaixo de 1 km (arredondado de 10 em 10 m); acima, "1,2 km".
export function formatDistance(km) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${kmFormat.format(km)} km`;
}

// Raio do controle deslizante: "2 km", "0,5 km".
export function formatRadius(km) {
  return `${kmFormat.format(km)} km`;
}
