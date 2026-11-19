// src/hooks/useAddressSearch.js
// Busca de endereço do painel "Perto de você" (issue #3). Consulta só quando o usuário
// envia o formulário: o Nominatim, usado pelo backend, não permite autocompletar.
// Uma nova busca cancela a anterior, para que uma resposta antiga não a sobrescreva.
import { useCallback, useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '../services/geocoding';
import { RequestStatus } from './useApiRequest';

export const MIN_QUERY_LENGTH = 3;
const IDLE = { status: RequestStatus.IDLE, query: '', matches: [], error: null };

// Uso: const { search, status, matches, error, retry, reset } = useAddressSearch(onFound);
// `onFound(match)` é chamado quando há exatamente um lugar: não há o que escolher.
export default function useAddressSearch(onFound) {
  const [state, setState] = useState(IDLE);
  const controller = useRef(null);
  const onFoundRef = useRef(onFound);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  useEffect(() => () => controller.current?.abort(), []);

  const search = useCallback(async (rawQuery) => {
    const query = rawQuery.trim();
    controller.current?.abort();
    if (query.length < MIN_QUERY_LENGTH) {
      setState({ ...IDLE, status: RequestStatus.ERROR, query, error: 'too-short' });
      return;
    }
    const current = new AbortController();
    controller.current = current;
    setState({ ...IDLE, status: RequestStatus.LOADING, query });
    try {
      const matches = await geocodeAddress(query, { signal: current.signal });
      if (current.signal.aborted) return;
      setState({ ...IDLE, status: RequestStatus.SUCCESS, query, matches });
      if (matches.length === 1) onFoundRef.current?.(matches[0]);
    } catch (error) {
      if (current.signal.aborted) return;
      setState({ ...IDLE, status: RequestStatus.ERROR, query, error });
    }
  }, []);

  const retry = useCallback(() => search(state.query), [search, state.query]);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, search, retry, reset };
}
