// src/pages/itineraryDraft.js
// Rascunho do roteiro em edição (issue #87): estado e regras puras, sem React nem API.
// Mover, remover, mudar horários e montar o envio ficam aqui para serem testados sem
// renderizar nada. O componente usa com useReducer(draftReducer, undefined, createDraft).

// Mesmos limites do backend (app/schemas/itinerary.py).
export const MAX_STOPS = 50;
export const MAX_TITLE_LENGTH = 120;

export const DraftAction = Object.freeze({
  LOAD: 'load',
  SET_TITLE: 'setTitle',
  SET_DATE: 'setDate',
  ADD_STOP: 'addStop',
  REMOVE_STOP: 'removeStop',
  MOVE_STOP: 'moveStop',
  SET_TIME: 'setTime',
  SET_PLACES: 'setPlaces',
  APPLY_WARNINGS: 'applyWarnings',
});

const TIME_FIELDS = new Set(['startTime', 'endTime']);

// `places` guarda nome e categoria por id: a API de roteiros devolve só o place_id.
// `nextKey` gera a chave de cada parada no próprio estado, para o reducer seguir puro;
// a chave identifica a parada no React e no arrastar, mesmo com o local repetido.
export function createDraft() {
  return { title: '', date: '', stops: [], places: {}, nextKey: 1 };
}

function placeInfo(place) {
  return {
    name: place?.name ?? null,
    category: place?.category ?? null,
    missing: place?.missing === true,
  };
}

function newStop(state, placeId, fields = {}) {
  return {
    key: `stop-${state.nextKey}`,
    placeId,
    startTime: fields.startTime ?? '',
    endTime: fields.endTime ?? '',
    eventId: fields.eventId ?? null,
    conflictWarning: fields.conflictWarning ?? null,
  };
}

// itinerary: formato de services/itineraries.js. Os nomes já conhecidos são mantidos.
function load(state, { itinerary, places = {} }) {
  let next = {
    ...createDraft(),
    title: itinerary.title ?? '',
    date: itinerary.date ?? '',
    places: { ...state.places, ...mapPlaces(places) },
    nextKey: state.nextKey,
  };
  const stops = [];
  for (const stop of itinerary.stops ?? []) {
    stops.push(newStop(next, stop.placeId, stop));
    next = { ...next, nextKey: next.nextKey + 1 };
  }
  return { ...next, stops };
}

function mapPlaces(places) {
  return Object.fromEntries(Object.entries(places).map(([id, place]) => [id, placeInfo(place)]));
}

function addStop(state, { place }) {
  if (!place?.id || state.stops.length >= MAX_STOPS) return state;
  return {
    ...state,
    stops: [...state.stops, newStop(state, place.id)],
    places: { ...state.places, [place.id]: placeInfo(place) },
    nextKey: state.nextKey + 1,
  };
}

function moveStop(state, { from, to }) {
  const last = state.stops.length - 1;
  if (from === to || from < 0 || from > last || to < 0 || to > last) return state;
  const stops = [...state.stops];
  const [moved] = stops.splice(from, 1);
  stops.splice(to, 0, moved);
  return { ...state, stops };
}

// O aviso de fechamento depende do horário de chegada da própria parada e da data: quando
// eles mudam, o aviso antigo deixa de valer até a próxima validação.
function setTime(state, { key, field, value }) {
  if (!TIME_FIELDS.has(field)) return state;
  return {
    ...state,
    stops: state.stops.map((stop) => {
      if (stop.key !== key) return stop;
      const conflictWarning = field === 'startTime' ? null : stop.conflictWarning;
      return { ...stop, [field]: value ?? '', conflictWarning };
    }),
  };
}

// Avisos que o backend calculou para `input` (o envio, na mesma ordem das paradas). Se o
// rascunho mudou desde o envio, a resposta é antiga e é descartada; as chaves das paradas
// são mantidas para não remontar a lista.
function applyWarnings(state, { input, warnings }) {
  const current = toItineraryInput(state);
  if (sameInput(current, input) === false || warnings.length !== state.stops.length) {
    return state;
  }
  return {
    ...state,
    stops: state.stops.map((stop, index) => ({
      ...stop,
      conflictWarning: warnings[index] ?? null,
    })),
  };
}

export function sameInput(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function draftReducer(state, action) {
  switch (action.type) {
    case DraftAction.LOAD:
      return load(state, action);
    case DraftAction.SET_TITLE:
      return { ...state, title: (action.title ?? '').slice(0, MAX_TITLE_LENGTH) };
    case DraftAction.SET_DATE:
      return {
        ...state,
        date: action.date ?? '',
        stops: state.stops.map((stop) => ({ ...stop, conflictWarning: null })),
      };
    case DraftAction.ADD_STOP:
      return addStop(state, action);
    case DraftAction.REMOVE_STOP:
      return { ...state, stops: state.stops.filter((stop) => stop.key !== action.key) };
    case DraftAction.MOVE_STOP:
      return moveStop(state, action);
    case DraftAction.SET_TIME:
      return setTime(state, action);
    case DraftAction.SET_PLACES:
      return { ...state, places: { ...state.places, ...mapPlaces(action.places) } };
    case DraftAction.APPLY_WARNINGS:
      return applyWarnings(state, action);
    default:
      return state;
  }
}

// O que vai para createItinerary/replaceItinerary, na ordem de visita.
export function toItineraryInput(state) {
  return {
    title: state.title.trim(),
    date: state.date || null,
    stops: state.stops.map((stop) => ({
      placeId: stop.placeId,
      startTime: stop.startTime || null,
      endTime: stop.endTime || null,
      eventId: stop.eventId,
    })),
  };
}

// Mesma regra do backend: com os dois horários, a saída vem depois da chegada.
// "HH:MM" e "HH:MM:SS" se comparam como texto depois de completar os segundos.
export function stopTimeError(stop) {
  if (!stop.startTime || !stop.endTime) return null;
  const seconds = (time) => (time.length === 5 ? `${time}:00` : time);
  return seconds(stop.endTime) <= seconds(stop.startTime)
    ? 'A saída precisa ser depois da chegada.'
    : null;
}

export function canSaveDraft(state) {
  return (
    state.title.trim().length > 0 &&
    state.stops.length <= MAX_STOPS &&
    state.stops.every((stop) => stopTimeError(stop) === null)
  );
}

// Ids de locais ainda sem nome conhecido, para buscar os detalhes de cada um.
export function unnamedPlaceIds(state) {
  const ids = new Set(state.stops.map((stop) => stop.placeId));
  return [...ids].filter((id) => !state.places[id]);
}
