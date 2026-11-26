// src/hooks/useConflictCheck.js
// Aviso de local fechado enquanto o roteiro é montado (issue #88): quando a data ou a
// chegada de alguma parada muda, espera uma pausa e consulta POST /api/itineraries/validate.
// O resultado chega ao rascunho por APPLY_CLOSURES, que o descarta se a data ou as
// chegadas mudaram enquanto isso. A consulta anterior é cancelada a cada mudança.
import { useCallback, useEffect, useState } from 'react';
import {
  closureCheckKey,
  closureCheckRequest,
  DraftAction,
  needsClosureCheck,
} from '../pages/itineraryDraft';
import { validateItinerary } from '../services/itineraries';

export const CHECK_DEBOUNCE_MS = 500;

export const CheckStatus = Object.freeze({
  IDLE: 'idle',
  CHECKING: 'checking',
  ERROR: 'error',
});

// enabled: o roteiro já foi carregado. markChecked(key) e initialCheckedKey: a chave já tem
// avisos do backend (o roteiro acabou de ser carregado ou salvo) e não precisa ser
// consultada de novo.
export default function useConflictCheck(
  draft,
  dispatch,
  { enabled = true, initialCheckedKey = null } = {},
) {
  const key = closureCheckKey(draft);
  const active = enabled && needsClosureCheck(draft);
  const [checkedKey, setCheckedKey] = useState(initialCheckedKey);
  const [failure, setFailure] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active || key === checkedKey) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      validateItinerary(closureCheckRequest(key), { signal: controller.signal }).then(
        (stops) => {
          if (controller.signal.aborted) return;
          dispatch({
            type: DraftAction.APPLY_CLOSURES,
            key,
            warnings: stops.map((stop) => stop.conflictWarning),
          });
          setCheckedKey(key);
          setFailure(null);
        },
        (error) => {
          if (!controller.signal.aborted) setFailure({ key, attempt, error });
        },
      );
    }, CHECK_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, key, checkedKey, attempt, dispatch]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const markChecked = useCallback((checked) => setCheckedKey(checked), []);

  let status = CheckStatus.IDLE;
  if (active && key !== checkedKey) {
    const failed = failure?.key === key && failure.attempt === attempt;
    status = failed ? CheckStatus.ERROR : CheckStatus.CHECKING;
  }
  return {
    status,
    error: status === CheckStatus.ERROR ? failure.error : null,
    retry,
    markChecked,
  };
}
