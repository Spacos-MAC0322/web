// src/components/AuthProvider.jsx
import { AuthContext, useAuthState } from '../hooks/useAuth';

// Um único estado de autenticação para todo o app (página de login, Navbar, rotas privadas).
export default function AuthProvider({ children }) {
  const auth = useAuthState();
  return <AuthContext value={auth}>{children}</AuthContext>;
}
