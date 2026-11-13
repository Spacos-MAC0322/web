// src/hooks/usePlacesInBounds.js
// Mantém os pinos da área visível do mapa. Cada movimento/zoom agenda uma nova consulta
// (com debounce) e cancela a anterior, para que uma resposta antiga nunca sobrescreva
// uma mais recente. Os pinos atuais continuam na tela enquanto a nova consulta carrega.
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPlacesInBounds, toBoundsParams } from '../services/places';

const DEBOUNCE_MS = 300;

export const PlacesStatus = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
});

const sameParams = (a, b) =>
  a !== null &&
  b !== null &&
  a.sw_lat === b.sw_lat &&
  a.sw_lng === b.sw_lng &&
  a.ne_lat === b.ne_lat &&
  a.ne_lng === b.ne_lng;

// Uso: const { places, status, error, updateBounds, retry } = usePlacesInBounds();
//      <Map places={places} onBoundsChange={updateBounds} />
// `error` é um ApiError cuja `message` já pode ser exibida ao usuário.
export default function usePlacesInBounds() {
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState(PlacesStatus.IDLE);
  const [error, setError] = useState(null);
  const lastParams = useRef(null);
  const controller = useRef(null);
  const timer = useRef(null);

  const load = useCallback(async (params) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setStatus(PlacesStatus.LOADING);
    try {
      const pins = await fetchPlacesInBounds(params, { signal: current.signal });
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
