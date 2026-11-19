// src/hooks/useGeolocation.js
// "Usar minha localização" (issue #3): pede a posição ao navegador uma vez por clique.
// Só aceita posições dentro da área do mapa (Grande São Paulo); fora dela, o mapa não
// conseguiria mostrar o ponto.
//
// A primeira leitura logo após o usuário permitir a localização costuma ser grosseira
// (estimada pelo IP ou pelo Wi-Fi antes da varredura, com erro de quilômetros); o
// navegador a refina nos segundos seguintes. Por isso a posição é acompanhada por um
// instante (watchPosition, sem cache) e vale a leitura mais precisa: a primeira com erro
// de até GOOD_ACCURACY_M, ou a melhor obtida até SETTLE_MS depois da primeira leitura.
import { useCallback, useEffect, useRef, useState } from 'react';
import { isInsideMapBounds } from '../services/geo';
import { RequestStatus } from './useApiRequest';

export const GOOD_ACCURACY_M = 100;
export const SETTLE_MS = 6000;
const OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

export const GeolocationMessages = Object.freeze({
  unsupported: 'Seu navegador não informa a localização. Digite um endereço de referência.',
  denied:
    'Sem permissão para usar sua localização. Libere o acesso no navegador ou digite um endereço.',
  unavailable: 'Não foi possível descobrir sua localização agora. Tente de novo ou digite um endereço.',
  timeout: 'A localização demorou para responder. Tente de novo ou digite um endereço.',
  outside:
    'Sua localização está fora da área do mapa (Grande São Paulo). Digite um endereço em São Paulo.',
});

// Códigos de GeolocationPositionError: 1 = negada, 2 = indisponível, 3 = tempo esgotado.
const ERROR_MESSAGES = {
  1: GeolocationMessages.denied,
  2: GeolocationMessages.unavailable,
  3: GeolocationMessages.timeout,
};

// Acompanha a posição até ela ficar precisa (ou o prazo acabar) e resolve com a melhor
// leitura, { coords }, ou com { code } quando nenhuma chegou. `cancel` encerra antes.
export function watchBestPosition(geolocation) {
  let best = null;
  let watchId = null;
  let timer = null;
  let done = false;
  let settle;
  const promise = new Promise((resolve) => {
    settle = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId !== null) geolocation.clearWatch(watchId);
      resolve(result);
    };
  });
  watchId = geolocation.watchPosition(
    (reading) => {
      if (!best || reading.coords.accuracy < best.coords.accuracy) best = reading;
      if (best.coords.accuracy <= GOOD_ACCURACY_M) settle(best);
      else timer ??= setTimeout(() => settle(best), SETTLE_MS);
    },
    // Um erro depois de alguma leitura (ex.: tempo esgotado ao refinar) não desfaz a busca.
    (failure) => settle(best ?? { code: failure?.code }),
    OPTIONS,
  );
  // O navegador pode responder dentro da própria chamada, antes de watchId existir.
  if (done) geolocation.clearWatch(watchId);
  return { promise, cancel: () => settle(null) };
}

// Uso: const { locate, status, error } = useGeolocation();
//      locate().then((position) => position && setOrigin(position));
// `locate` resolve com [lat, lng], ou com null quando falha (a mensagem fica em `error`).
export default function useGeolocation() {
  const [status, setStatus] = useState(RequestStatus.IDLE);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const watch = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      watch.current?.cancel();
    };
  }, []);

  const locate = useCallback(async () => {
    const fail = (message) => {
      if (mounted.current) {
        setError(message);
        setStatus(RequestStatus.ERROR);
      }
      return null;
    };
    if (!navigator.geolocation) return fail(GeolocationMessages.unsupported);

    watch.current?.cancel();
    setStatus(RequestStatus.LOADING);
    setError(null);
    watch.current = watchBestPosition(navigator.geolocation);
    const reading = await watch.current.promise;
    if (reading === null || !mounted.current) return null; // substituída ou desmontada
    if (!reading.coords) return fail(ERROR_MESSAGES[reading.code] ?? GeolocationMessages.unavailable);
    const position = [reading.coords.latitude, reading.coords.longitude];
    if (!isInsideMapBounds(position)) return fail(GeolocationMessages.outside);
    setStatus(RequestStatus.SUCCESS);
    return position;
  }, []);

  return { locate, status, error };
}
