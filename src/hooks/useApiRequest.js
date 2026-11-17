// src/hooks/useApiRequest.js
// Executa uma consulta ao backend e expõe seu estado (carregando, sucesso ou erro).
// A consulta é refeita quando `request` muda (memorize-a com useCallback) e a anterior é
// cancelada, para que uma resposta antiga nunca sobrescreva uma mais recente.
import { useCallback, useEffect, useState } from 'react';

export const RequestStatus = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
});

// Uso: const load = useCallback((signal) => fetchPlaceDetail(id, { signal }), [id]);
//      const { data, status, error, retry } = useApiRequest(load);
// `error` costuma ser um ApiError, cuja `message` já pode ser exibida ao usuário.
export default function useApiRequest(request) {
  const [attempt, setAttempt] = useState(0);
  // O resultado guarda a consulta e a tentativa que o produziram: se alguma delas mudou,
  // o resultado é antigo e o estado volta a ser "carregando", sem setState no efeito.
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const settle = (data, error) => {
      if (!controller.signal.aborted) setResult({ request, attempt, data, error });
    };
    request(controller.signal).then(
      (data) => settle(data, null),
      (error) => settle(null, error),
    );
    return () => controller.abort();
  }, [request, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  if (result?.request !== request || result.attempt !== attempt) {
    return { data: null, status: RequestStatus.LOADING, error: null, retry };
  }
  const status = result.error ? RequestStatus.ERROR : RequestStatus.SUCCESS;
  return { data: result.data, status, error: result.error, retry };
}
