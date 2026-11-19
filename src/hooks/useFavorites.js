// src/hooks/useFavorites.js
// Estado compartilhado dos espaços favoritos do usuário autenticado.
// Quando o estado vive no <FavoritesProvider>, usar useFavorites() atualiza a lista e o
// ícone de estrela em todos os cards e na página de detalhes. Fora do provider (ex.: em
// testes unitários isolados de componentes), devolve um fallback anônimo seguro.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RequestStatus } from './useApiRequest';
import { AuthStatus, useAuth } from './useAuth';
import { addFavoritePlace, fetchFavorites, removeFavoritePlace } from '../services/favorites';

export const FavoritesContext = createContext(null);

const FALLBACK_FAVORITES = Object.freeze({
  favorites: [],
  status: RequestStatus.IDLE,
  error: null,
  isAuthenticated: false,
  authStatus: AuthStatus.ANONYMOUS,
  isFavorite: () => false,
  isPending: () => false,
  addFavorite: async () => {},
  removeFavorite: async () => {},
  toggleFavorite: async () => {},
  retry: () => {},
});

export function useFavoritesState() {
  const { user, status: authStatus, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? (user?.id ?? user?.email ?? 'authenticated') : null;
  const [attempt, setAttempt] = useState(0);
  // Mesmo padrão de useApiRequest: guarda userId e attempt junto ao resultado para
  // derivar o estado atual sem chamar setState de forma síncrona dentro do useEffect.
  const [result, setResult] = useState(null);
  const [pendingState, setPendingState] = useState({ userId: null, ids: new Set() });

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    fetchFavorites({ signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult({ userId, attempt, data, error: null });
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          setResult({ userId, attempt, data: [], error });
        }
      },
    );
    return () => controller.abort();
  }, [userId, attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const settled = Boolean(userId && result?.userId === userId && result?.attempt === attempt);
  const favorites = useMemo(
    () => (settled && Array.isArray(result.data) ? result.data : []),
    [settled, result],
  );
  const status = !userId
    ? RequestStatus.IDLE
    : !settled
      ? RequestStatus.LOADING
      : result.error
        ? RequestStatus.ERROR
        : RequestStatus.SUCCESS;
  const error = settled ? result.error : null;

  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);
  const pendingIds = useMemo(
    () => (userId && pendingState.userId === userId ? pendingState.ids : new Set()),
    [userId, pendingState],
  );

  const isFavorite = useCallback((placeId) => favoriteIds.has(placeId), [favoriteIds]);
  const isPending = useCallback((placeId) => pendingIds.has(placeId), [pendingIds]);

  const setPending = useCallback(
    (placeId, active) => {
      setPendingState((current) => {
        const base = current.userId === userId ? current.ids : new Set();
        const next = new Set(base);
        if (active) next.add(placeId);
        else next.delete(placeId);
        return { userId, ids: next };
      });
    },
    [userId],
  );

  const addFavorite = useCallback(
    async (placeId) => {
      setPending(placeId, true);
      try {
        const added = await addFavoritePlace(placeId);
        setResult((current) => {
          if (!userId) return current;
          const prevList =
            current?.userId === userId && Array.isArray(current.data) ? current.data : [];
          const nextList = prevList.some((item) => item.id === added.id)
            ? prevList
            : [...prevList, added];
          return { userId, attempt, data: nextList, error: null };
        });
        return added;
      } finally {
        setPending(placeId, false);
      }
    },
    [setPending, userId, attempt],
  );

  const removeFavorite = useCallback(
    async (placeId) => {
      setPending(placeId, true);
      try {
        await removeFavoritePlace(placeId);
        setResult((current) => {
          if (!userId) return current;
          const prevList =
            current?.userId === userId && Array.isArray(current.data) ? current.data : [];
          return {
            userId,
            attempt,
            data: prevList.filter((item) => item.id !== placeId),
            error: null,
          };
        });
      } finally {
        setPending(placeId, false);
      }
    },
    [setPending, userId, attempt],
  );

  const toggleFavorite = useCallback(
    async (placeId) => {
      if (favoriteIds.has(placeId)) {
        await removeFavorite(placeId);
        return false;
      }
      await addFavorite(placeId);
      return true;
    },
    [favoriteIds, addFavorite, removeFavorite],
  );

  return useMemo(
    () => ({
      favorites,
      status,
      error,
      isAuthenticated,
      authStatus,
      isFavorite,
      isPending,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      retry,
    }),
    [
      favorites,
      status,
      error,
      isAuthenticated,
      authStatus,
      isFavorite,
      isPending,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      retry,
    ],
  );
}

export function useFavorites() {
  return useContext(FavoritesContext) ?? FALLBACK_FAVORITES;
}
