// src/pages/itineraryFormat.js
// Textos e caminhos das páginas de roteiros (/rotas e /rotas/:id).

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

// "2026-11-28" → "sábado, 28 de novembro de 2026". Em UTC para a data não mudar de dia
// por causa do fuso de quem abre a página.
export function formatItineraryDate(date) {
  if (!date) return 'Sem data definida';
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : DATE_FORMAT.format(parsed);
}

export function stopCountText(count) {
  return count === 1 ? '1 parada' : `${count} paradas`;
}

// Ids vêm do backend e são codificados na URL, como em placePath.
export function itineraryPath(id) {
  return `/rotas/${encodeURIComponent(id)}`;
}

export const NEW_ITINERARY_PATH = '/rotas/novo';
