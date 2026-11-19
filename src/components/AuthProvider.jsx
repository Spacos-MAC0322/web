// src/components/AuthProvider.jsx
import { AuthContext, useAuthState } from '../hooks/useAuth';
import { FavoritesContext, useFavoritesState } from '../hooks/useFavorites';

function FavoritesProvider({ children }) {
  const favorites = useFavoritesState();
  return <FavoritesContext value={favorites}>{children}</FavoritesContext>;
}

// Um único estado de autenticação e favoritos para todo o app (página de login, Navbar, rotas privadas).
export default function AuthProvider({ children }) {
  const auth = useAuthState();
  return (
    <AuthContext value={auth}>
      <FavoritesProvider>{children}</FavoritesProvider>
    </AuthContext>
  );
}
