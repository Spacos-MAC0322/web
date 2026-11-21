// src/hooks/usePlacesInBounds.js
// Mantém os pinos da área visível do mapa que atendem aos filtros (user story #6). Cada
// movimento/zoom agenda uma nova consulta (com debounce); mudar os filtros consulta de novo
// a mesma área. A consulta anterior é cancelada, para que uma resposta antiga nunca
// sobrescreva uma mais recente, e os pinos atuais ficam na tela enquanto a nova carrega.
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPlacesInBounds, toBoundsParams } from '../services/places';
import { EMPTY_FILTERS, filtersKey } from '../services/searchFilters';
import { RequestStatus } from './useApiRequest';

const DEBOUNCE_MS = 300;

export const PlacesStatus = RequestStatus;

const sameParams = (a, b) =>
  a !== null &&
  b !== null &&
  a.sw_lat === b.sw_lat &&
  a.sw_lng === b.sw_lng &&
  a.ne_lat === b.ne_lat &&
  a.ne_lng === b.ne_lng;

// Uso: const { places, status, error, updateBounds, retry } = usePlacesInBounds(filters);
//      <Map places={places} onBoundsChange={updateBounds} />
// `error` é um ApiError cuja `message` já pode ser exibida ao usuário.
export default function usePlacesInBounds(filters = EMPTY_FILTERS) {
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState(PlacesStatus.IDLE);
  const [error, setError] = useState(null);
  const lastParams = useRef(null);
  const controller = useRef(null);
  const timer = useRef(null);
  const currentFilters = useRef(filters);
  const key = filtersKey(filters);

  const load = useCallback(async (params) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setStatus(PlacesStatus.LOADING);
    try {
      const pins = await fetchPlacesInBounds(params, {
        signal: current.signal,
        filters: currentFilters.current,
      });
      if (current.signal.aborted) return;
      setPlaces(pins);
      setError(null);
      setStatus(PlacesStatus.SUCCESS);
    } catch (failure) {
      if (current.signal.aborted) return;
      setError(failure);
      setStatus(PlacesStatus.ERROR);
    }
  }, []);

  // Recebe o LatLngBounds do Leaflet (map.getBounds()).
  const updateBounds = useCallback(
    (bounds) => {
      const params = toBoundsParams(bounds);
      if (params === null || sameParams(params, lastParams.current)) return;
      lastParams.current = params;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => load(params), DEBOUNCE_MS);
    },
    [load],
  );

  const retry = useCallback(() => {
    if (lastParams.current !== null) load(lastParams.current);
  }, [load]);

  // Filtros novos: consulta de novo a área atual (o texto já chega com debounce do painel).
  useEffect(() => {
    if (currentFilters.current === filters) return;
    currentFilters.current = filters;
    clearTimeout(timer.current);
    if (lastParams.current !== null) load(lastParams.current);
    // `key` resume os filtros; o objeto pode mudar sem que eles mudem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, load]);

  // Ao desmontar, descarta a consulta pendente. lastParams é zerado para que, ao montar de
  // novo (ex.: StrictMode em desenvolvimento), os mesmos limites voltem a ser consultados.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.abort();
      lastParams.current = null;
    },
    [],
  );

  return { places, status, error, updateBounds, retry };
}
