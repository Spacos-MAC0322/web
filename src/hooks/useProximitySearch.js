// src/hooks/useProximitySearch.js
// Estado da busca "Perto de você" (issue #3): o ponto de referência (endereço escolhido
// ou localização do navegador), o raio e os espaços dentro dele que atendem aos filtros
// (user story #6). Sem ponto, a página Explorar volta a mostrar os pinos da área visível.
import { useCallback, useEffect, useState } from 'react';
import { distanceKm } from '../services/geo';
import { fetchNearbyPlaces } from '../services/places';
import { EMPTY_FILTERS, filtersKey } from '../services/searchFilters';
import { RequestStatus } from './useApiRequest';
import useGeolocation from './useGeolocation';

export const DEFAULT_RADIUS_KM = 2;
export const RADIUS_DEBOUNCE_MS = 300;
export const CURRENT_LOCATION_LABEL = 'sua localização';

// Mantém o último valor estável por `delay` ms: arrastar o controle deslizante dispara
// uma consulta só quando o usuário para.
function useDebouncedValue(value, delay) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function withDistance(places, origin) {
  return places
    .map((place) => ({ ...place, distanceKm: distanceKm(origin, place.position) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Consulta os espaços próximos e cancela a anterior quando o ponto, o raio ou os filtros
// mudam, para que uma resposta antiga nunca sobrescreva uma mais recente. Enquanto a nova
// consulta carrega, os espaços anteriores continuam na tela (sem piscar o mapa).
function useNearbyPlaces(origin, radiusKm, filters) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, places: [], error: null });
  const position = origin?.position ?? null;
  const key = position
    ? `${position.join(',')}|${radiusKm}|${filtersKey(filters)}|${attempt}`
    : null;

  useEffect(() => {
    if (!position) return undefined;
    const controller = new AbortController();
    const [lat, lng] = position;
    fetchNearbyPlaces({ lat, lng, radiusKm }, { signal: controller.signal, filters }).then(
      (places) => {
        if (controller.signal.aborted) return;
        setResult({ key, places: withDistance(places, position), error: null });
      },
      (error) => {
        if (controller.signal.aborted) return;
        setResult((current) => ({ key, places: current.places, error }));
      },
    );
    return () => controller.abort();
    // `key` resume `position`, `radiusKm`, os filtros e `attempt`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  if (!position) return { places: [], status: RequestStatus.IDLE, error: null, retry };
  if (result.key !== key) {
    return { places: result.places, status: RequestStatus.LOADING, error: null, retry };
  }
  const status = result.error ? RequestStatus.ERROR : RequestStatus.SUCCESS;
  return { places: result.places, status, error: result.error, retry };
}

// Uso: const proximity = useProximitySearch(filters);
//      proximity.setOrigin({ label: 'MASP', position: [-23.56, -46.65] });
// `origin` é { label, position: [lat, lng], source: 'address' | 'location' } ou null.
export default function useProximitySearch(filters = EMPTY_FILTERS) {
  const [origin, setOriginState] = useState(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const settledRadiusKm = useDebouncedValue(radiusKm, RADIUS_DEBOUNCE_MS);
  const nearby = useNearbyPlaces(origin, settledRadiusKm, filters);
  const geolocation = useGeolocation();
  const { locate: requestPosition } = geolocation;

  const setOrigin = useCallback(
    ({ label, position }) => setOriginState({ label, position, source: 'address' }),
    [],
  );

  const locate = useCallback(async () => {
    const position = await requestPosition();
    if (position) setOriginState({ label: CURRENT_LOCATION_LABEL, position, source: 'location' });
  }, [requestPosition]);

  // "Limpar" do painel: sem ponto de referência e com o raio padrão.
  const clear = useCallback(() => {
    setOriginState(null);
    setRadiusKm(DEFAULT_RADIUS_KM);
  }, []);

  return {
    origin,
    radiusKm,
    // Raio da consulta em andamento: o círculo e a lista acompanham os resultados.
    searchedRadiusKm: settledRadiusKm,
    setRadiusKm,
    setOrigin,
    locate,
    clear,
    nearby,
    geolocation: { status: geolocation.status, error: geolocation.error },
  };
}
