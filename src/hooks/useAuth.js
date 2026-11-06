// src/hooks/useAuth.js
// Estado de autenticação compartilhado: usuário logado, token persistido no localStorage
// (via services/api.js) e as ações login(), register() e logout().
// O estado vive no <AuthProvider>; os componentes o leem com useAuth().
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { ApiError, clearAuthToken, getAuthToken, setAuthToken } from '../services/api';

export const AuthStatus = Object.freeze({
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
});

export const AuthContext = createContext(null);

async function fetchCurrentUser(signal) {
  const { data } = await api.get('/api/auth/me', { signal });
  return data;
}

// Usado apenas pelo <AuthProvider>, para que todo o app compartilhe um único estado.
export function useAuthState() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    getAuthToken() ? AuthStatus.LOADING : AuthStatus.ANONYMOUS,
  );

  // Restaura a sessão salva (ex.: ao recarregar a página ou reabrir o PWA).
  useEffect(() => {
    if (!getAuthToken()) return undefined;
    const controller = new AbortController();
    fetchCurrentUser(controller.signal)
      .then((current) => {
        setUser(current);
        setStatus(AuthStatus.AUTHENTICATED);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        // Só um 401 invalida o token; numa queda de rede ele é mantido para a próxima visita.
        if (error instanceof ApiError && error.status === 401) clearAuthToken();
        setStatus(AuthStatus.ANONYMOUS);
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setAuthToken(data.access_token);
    try {
      const current = await fetchCurrentUser();
      setUser(current);
      setStatus(AuthStatus.AUTHENTICATED);
      return current;
    } catch (error) {
      clearAuthToken();
      throw error;
    }
  }, []);

  const register = useCallback(
    async ({ name, email, password }) => {
      await api.post('/api/auth/register', { name, email, password });
      return login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setStatus(AuthStatus.ANONYMOUS);
  }, []);

  return useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === AuthStatus.AUTHENTICATED,
      login,
      register,
      logout,
    }),
    [user, status, login, register, logout],
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return context;
}
