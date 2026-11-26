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
  APPLY_CLOSURES: 'applyClosures',
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

// Avisos que o backend calculou para `input` (o envio, na mesma ordem das paradas). Se a
// data ou as paradas mudaram desde o envio, a resposta é antiga e é descartada; o título
// não influencia os avisos. As chaves das paradas são mantidas para não remontar a lista.
function applyWarnings(state, { input, warnings }) {
  const current = toItineraryInput(state);
  const stale =
    current.date !== (input.date ?? null) ||
    !sameInput(current.stops, input.stops) ||
    warnings.length !== state.stops.length;
  if (stale) return state;
  return {
    ...state,
    stops: state.stops.map((stop, index) => ({
      ...stop,
      conflictWarning: warnings[index] ?? null,
    })),
  };
}

// Resultado de POST /validate para a chave `key` (closureCheckKey). Descartado se a data ou
// as chegadas mudaram enquanto a consulta acontecia.
function applyClosures(state, { key, warnings }) {
  if (closureCheckKey(state) !== key || warnings.length !== state.stops.length) return state;
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
    case DraftAction.APPLY_CLOSURES:
      return applyClosures(state, action);
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

// "14:00:00" → "14:00", para exibir.
export function shortTime(time) {
  return time ? time.slice(0, 5) : '';
}

function seconds(time) {
  return time.length === 5 ? `${time}:00` : time;
}

// Conflitos entre paradas seguidas (issue #88, aviso amarelo), por chave da parada. Cada
// parada com chegada é comparada à última parada anterior que tem horário; paradas sem
// horário são puladas. O roteiro tem uma só data: passar da meia-noite também é conflito.
// Só avisa, não impede salvar: o backend aceita e o usuário pode ajustar depois.
export function scheduleConflicts(stops) {
  const conflicts = {};
  let previous = null;
  stops.forEach((stop, index) => {
    const start = stop.startTime ? seconds(stop.startTime) : null;
    if (start && previous) {
      const label = `parada ${previous.number}`;
      if (previous.start && start < previous.start) {
        conflicts[stop.key] =
          `Começa antes da ${label}, que é às ${shortTime(previous.start)}.`;
      } else if (previous.start && start === previous.start) {
        conflicts[stop.key] = `Começa no mesmo horário da ${label} (${shortTime(start)}).`;
      } else if (previous.end && start < previous.end) {
        conflicts[stop.key] =
          `Começa antes de você sair da ${label}, às ${shortTime(previous.end)}.`;
      }
    }
    if (stop.startTime || stop.endTime) {
      previous = {
        number: index + 1,
        start,
        end: stop.endTime ? seconds(stop.endTime) : null,
      };
    }
  });
  return conflicts;
}

// O que o aviso de fechamento (POST /validate) leva em conta: a data e a chegada de cada
// local. Mudou essa chave, os horários de funcionamento precisam ser conferidos de novo.
export function closureCheckKey(state) {
  return JSON.stringify({
    date: state.date || null,
    stops: state.stops.map((stop) => [stop.placeId, stop.startTime || null]),
  });
}

// O inverso de closureCheckKey: o que enviar a validateItinerary para conferir essa chave.
export function closureCheckRequest(key) {
  const { date, stops } = JSON.parse(key);
  return {
    date,
    stops: stops.map(([placeId, startTime]) => ({
      placeId,
      startTime,
      endTime: null,
      eventId: null,
    })),
  };
}

// Há o que conferir no backend: data definida e ao menos uma parada com chegada.
export function needsClosureCheck(state) {
  return Boolean(state.date) && state.stops.some((stop) => stop.startTime);
}

// Fim de um arrasto (@dnd-kit): a parada `activeKey` foi solta sobre `overKey`. Devolve
// as posições para MOVE_STOP, ou null se soltou fora da lista ou no mesmo lugar.
export function dragMove(stops, activeKey, overKey) {
  if (!overKey || activeKey === overKey) return null;
  const from = stops.findIndex((stop) => stop.key === activeKey);
  const to = stops.findIndex((stop) => stop.key === overKey);
  return from < 0 || to < 0 ? null : { from, to };
}

// Ids de locais ainda sem nome conhecido, para buscar os detalhes de cada um.
export function unnamedPlaceIds(state) {
  const ids = new Set(state.stops.map((stop) => stop.placeId));
  return [...ids].filter((id) => !state.places[id]);
}
