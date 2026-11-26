// src/services/itineraries.js
// Roteiros do usuário logado (user story #11): GET/POST /api/itineraries,
// GET/PUT/DELETE /api/itineraries/{id} e POST /api/itineraries/validate.
// Os componentes trabalham só com o formato daqui (camelCase); o formato da API
// (snake_case) fica restrito a este arquivo.
import { MAX_STOPS } from '../pages/itineraryDraft';
import api, { ApiError, ApiErrorKind } from './api';

function itineraryPath(id) {
  return `/api/itineraries/${encodeURIComponent(id)}`;
}

function toStop(stop) {
  return {
    placeId: stop.place_id,
    order: stop.order,
    startTime: stop.planned_start_time ?? null,
    endTime: stop.planned_end_time ?? null,
    eventId: stop.event_id ?? null,
    conflictWarning: stop.conflict_warning ?? null,
  };
}

function toItinerary(data) {
  const stops = Array.isArray(data?.stops) ? data.stops.map(toStop) : [];
  return {
    id: data.id,
    title: data.title,
    date: data.date ?? null,
    stops: stops.sort((a, b) => a.order - b.order),
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
    weatherForecast: data.weather_forecast ?? null,
    weatherWarning: data.weather_warning ?? null,
  };
}

function toSummary(item) {
  return {
    id: item.id,
    title: item.title,
    date: item.date ?? null,
    stopCount: Number.isInteger(item.stop_count) ? item.stop_count : 0,
    createdAt: item.created_at ?? null,
    updatedAt: item.updated_at ?? null,
  };
}

// A ordem de visita é a posição na lista: o backend recusa `order` repetido, então ela é
// sempre renumerada de 1 a n aqui, independente do que o rascunho guardar.
function toApiStops(stops) {
  return stops.map((stop, index) => ({
    place_id: stop.placeId,
    order: index + 1,
    planned_start_time: stop.startTime || null,
    planned_end_time: stop.endTime || null,
    event_id: stop.eventId ?? null,
  }));
}

function toApiBody({ title, date, stops }) {
  return { title, date: date || null, stops: toApiStops(stops) };
}

export async function listItineraries({ signal } = {}) {
  const { data } = await api.get('/api/itineraries', { signal });
  return Array.isArray(data) ? data.map(toSummary) : [];
}

// Um roteiro inexistente ou de outro usuário rejeita com ApiError de status 404.
export async function fetchItinerary(id, { signal } = {}) {
  const { data } = await api.get(itineraryPath(id), { signal });
  return toItinerary(data);
}

// input: { title, date, stops: [{ placeId, startTime, endTime, eventId }] }, na ordem de
// visita. A resposta traz conflictWarning recalculado pelo backend.
export async function createItinerary(input, { signal } = {}) {
  const { data } = await api.post('/api/itineraries', toApiBody(input), { signal });
  return toItinerary(data);
}

// O PUT substitui o roteiro inteiro: envie todas as paradas, já na nova ordem.
export async function replaceItinerary(id, input, { signal } = {}) {
  const { data } = await api.put(itineraryPath(id), toApiBody(input), { signal });
  return toItinerary(data);
}

export async function deleteItinerary(id, { signal } = {}) {
  await api.delete(itineraryPath(id), { signal });
}

// Acrescenta um espaço como última parada de um roteiro salvo, sem horário, mantendo as
// demais paradas como estão. O PUT substitui o roteiro inteiro, por isso ele é lido antes.
export async function addPlaceToItinerary(id, placeId, { signal } = {}) {
  const itinerary = await fetchItinerary(id, { signal });
  if (itinerary.stops.length >= MAX_STOPS) {
    throw new ApiError(`Este roteiro já tem ${MAX_STOPS} paradas, o limite.`, {
      kind: ApiErrorKind.CLIENT,
    });
  }
  return replaceItinerary(
    id,
    {
      title: itinerary.title,
      date: itinerary.date,
      stops: [...itinerary.stops, { placeId, startTime: null, endTime: null, eventId: null }],
    },
    { signal },
  );
}

// Previsão do tempo em São Paulo para `date` (YYYY-MM-DD), de hoje até 15 dias à frente
// (user story #13). Fora dessa janela, ou com a Open-Meteo indisponível, o backend responde
// 200 com forecast null e um aviso em `warning`.
export async function fetchWeather(date, { signal } = {}) {
  const { data } = await api.get('/api/itineraries/weather', { params: { date }, signal });
  const forecast = data?.weather_forecast;
  return {
    forecast: forecast
      ? {
          date: forecast.date,
          minTemperature: forecast.temperature_min,
          maxTemperature: forecast.temperature_max,
          weatherCode: forecast.weather_code,
          rainChance: forecast.precipitation_probability ?? null,
        }
      : null,
    warning: data?.weather_warning ?? null,
  };
}

// Confere os horários sem salvar. Exige data; devolve os avisos na mesma ordem das paradas.
export async function validateItinerary({ date, stops }, { signal } = {}) {
  const { data } = await api.post(
    '/api/itineraries/validate',
    { date, stops: toApiStops(stops) },
    { signal },
  );
  return Array.isArray(data) ? data.map(toStop) : [];
}
