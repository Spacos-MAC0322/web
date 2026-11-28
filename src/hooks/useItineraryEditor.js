// src/hooks/useItineraryEditor.js
// Editor de um roteiro (issue #87): carrega o roteiro salvo (ou começa um novo), guarda o
// rascunho e salva com POST (novo) ou PUT (existente). Use um editor por roteiro, com
// key={id} no componente, para que trocar de roteiro recomece o estado.
//
// A API devolve só o place_id de cada parada; os nomes vêm de GET /api/places/{id}, em
// paralelo, ao carregar. Ao criar, passe { initial: { itinerary, places } } para o editor
// da nova rota começar com o que já se sabe, sem consultar o backend de novo.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  canSaveDraft,
  createDraft,
  DraftAction,
  draftReducer,
  sameInput,
  toItineraryInput,
} from '../pages/itineraryDraft';
import { ApiError } from '../services/api';
import {
  createItinerary,
  deleteItinerary,
  fetchItinerary,
  replaceItinerary,
} from '../services/itineraries';
import { fetchPlaceDetail } from '../services/places';

export const EditorStatus = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  NOT_FOUND: 'not_found',
  ERROR: 'error',
});

export const Mutation = Object.freeze({
  IDLE: 'idle',
  SAVING: 'saving',
  DELETING: 'deleting',
});

function loadAction(itinerary, places) {
  return { type: DraftAction.LOAD, itinerary, places };
}

function initDraft(initial) {
  return initial?.itinerary
    ? draftReducer(createDraft(), loadAction(initial.itinerary, initial.places))
    : createDraft();
}

// Um local apagado ou despublicado responde 404 e fica marcado como indisponível; outra
// falha só deixa o nome desconhecido, sem impedir a edição.
async function fetchPlaceNames(placeIds, signal) {
  const results = await Promise.allSettled(
    placeIds.map((placeId) => fetchPlaceDetail(placeId, { signal })),
  );
  return Object.fromEntries(
    results.map((result, index) => {
      if (result.status === 'fulfilled') {
        const place = result.value;
        const category = place?.primary_category ?? place?.categories?.[0] ?? null;
        return [placeIds[index], { name: place?.name ?? null, category }];
      }
      const missing = result.reason instanceof ApiError && result.reason.status === 404;
      return [placeIds[index], { missing }];
    }),
  );
}

export default function useItineraryEditor(id = null, { initial = null } = {}) {
  // Decidido uma vez, ao montar: `initial` mudar depois (ex.: a página limpar o state da
  // navegação) não pode recarregar o roteiro por cima das edições.
  // 'saved': o roteiro `id` recém-criado; 'new': um roteiro novo que já começa com paradas
  // (ex.: "Novo roteiro com este lugar", na página do lugar).
  const [seedMode] = useState(() => {
    if (!initial?.itinerary) return null;
    if (!id) return 'new';
    return initial.itinerary.id === id ? 'saved' : null;
  });
  const seeded = seedMode === 'saved';
  const [draft, dispatch] = useReducer(draftReducer, seedMode ? initial : null, initDraft);
  const [savedId, setSavedId] = useState(id);
  // O que está salvo no backend, no formato do envio: compará-lo ao rascunho diz se há
  // alterações pendentes. Um roteiro novo começa "vazio", mesmo que já tenha paradas.
  const [savedInput, setSavedInput] = useState(() => {
    if (id && !seeded) return null;
    return toItineraryInput(seedMode === 'new' ? createDraft() : draft);
  });
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(() =>
    id && !seeded ? null : { attempt: 0, status: EditorStatus.READY, error: null },
  );
  const [mutation, setMutation] = useState({ status: Mutation.IDLE, error: null });
  // Impede dois envios seguidos antes de o React atualizar `mutation`.
  const busy = useRef(false);

  useEffect(() => {
    if (!id || (seeded && attempt === 0)) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      try {
        const itinerary = await fetchItinerary(id, { signal });
        const placeIds = [...new Set(itinerary.stops.map((stop) => stop.placeId))];
        const places = await fetchPlaceNames(placeIds, signal);
        if (signal.aborted) return;
        const action = loadAction(itinerary, places);
        dispatch(action);
        setSavedInput(toItineraryInput(draftReducer(createDraft(), action)));
        setLoaded({ attempt, status: EditorStatus.READY, error: null });
      } catch (error) {
        if (signal.aborted) return;
        const notFound = error instanceof ApiError && error.status === 404;
        const status = notFound ? EditorStatus.NOT_FOUND : EditorStatus.ERROR;
        setLoaded({ attempt, status, error });
      }
    })();
    return () => controller.abort();
  }, [id, seeded, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const status = loaded?.attempt === attempt ? loaded.status : EditorStatus.LOADING;
  const isDirty = savedInput !== null && !sameInput(savedInput, toItineraryInput(draft));
  const canSave = status === EditorStatus.READY && canSaveDraft(draft);

  // Devolve o roteiro salvo (com id e avisos recalculados) ou null se não salvou;
  // o motivo fica em `error`.
  const save = useCallback(async () => {
    if (busy.current || !canSave) return null;
    busy.current = true;
    const input = toItineraryInput(draft);
    setMutation({ status: Mutation.SAVING, error: null });
    try {
      const saved = savedId
        ? await replaceItinerary(savedId, input)
        : await createItinerary(input);
      setSavedId(saved.id);
      setSavedInput(input);
      dispatch({
        type: DraftAction.APPLY_WARNINGS,
        input,
        warnings: saved.stops.map((stop) => stop.conflictWarning),
      });
      setMutation({ status: Mutation.IDLE, error: null });
      return saved;
    } catch (error) {
      setMutation({ status: Mutation.IDLE, error });
      return null;
    } finally {
      busy.current = false;
    }
  }, [canSave, draft, savedId]);

  // Devolve true se excluiu. Um roteiro ainda não salvo não tem o que excluir.
  const remove = useCallback(async () => {
    if (busy.current || !savedId) return false;
    busy.current = true;
    setMutation({ status: Mutation.DELETING, error: null });
    try {
      await deleteItinerary(savedId);
      setMutation({ status: Mutation.IDLE, error: null });
      return true;
    } catch (error) {
      setMutation({ status: Mutation.IDLE, error });
      return false;
    } finally {
      busy.current = false;
    }
  }, [savedId]);

  const actions = useMemo(
    () => ({
      setTitle: (title) => dispatch({ type: DraftAction.SET_TITLE, title }),
      setDate: (date) => dispatch({ type: DraftAction.SET_DATE, date }),
      addStop: (place) => dispatch({ type: DraftAction.ADD_STOP, place }),
      removeStop: (key) => dispatch({ type: DraftAction.REMOVE_STOP, key }),
      moveStop: (from, to) => dispatch({ type: DraftAction.MOVE_STOP, from, to }),
      setTime: (key, field, value) => dispatch({ type: DraftAction.SET_TIME, key, field, value }),
    }),
    [],
  );

  return {
    draft,
    status,
    loadError: status === EditorStatus.ERROR ? loaded.error : null,
    retry,
    savedId,
    isNew: savedId === null,
    isDirty,
    canSave: canSave && mutation.status === Mutation.IDLE,
    mutation: mutation.status,
    error: mutation.error,
    save,
    remove,
    ...actions,
  };
}
