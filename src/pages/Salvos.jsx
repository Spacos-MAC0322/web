// src/pages/Salvos.jsx
// Página "Meus Favoritos" (/salvos): lista todos os espaços culturais que o usuário
// logado salvou, permitindo abrir os detalhes de cada lugar ou removê-lo da lista.
import { Link } from 'react-router-dom';
import PlaceCard from '../components/PlaceCard';
import RequestError from '../components/RequestError';
import { RequestStatus } from '../hooks/useApiRequest';
import { AuthStatus } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import styles from './Salvos.module.css';

const FALLBACK_ERROR = 'Não foi possível carregar seus espaços favoritos. Tente novamente.';

function AnonymousState() {
  return (
    <section className={styles.emptyCard} aria-labelledby="salvos-login-title">
      <h2 id="salvos-login-title" className={styles.emptyTitle}>
        Entre para ver seus espaços salvos
      </h2>
      <p className={styles.emptyText}>
        Com uma conta no Spaços, você pode favoritar espaços culturais e consultá-los facilmente
        depois.
      </p>
      <Link to="/login" state={{ from: '/salvos' }} className={styles.actionLink}>
        Entrar na conta
      </Link>
    </section>
  );
}

function EmptyFavoritesState() {
  return (
    <section className={styles.emptyCard} aria-labelledby="salvos-empty-title">
      <h2 id="salvos-empty-title" className={styles.emptyTitle}>
        Você ainda não salvou nenhum espaço
      </h2>
      <p className={styles.emptyText}>
        Toque na estrela nos cards ou na página de detalhes de um espaço cultural para guardá-lo
        aqui.
      </p>
      <Link to="/explorar" className={styles.actionLink}>
        Explorar espaços
      </Link>
    </section>
  );
}

function FavoritesList({ favorites }) {
  return (
    <ul className={styles.grid} aria-label="Espaços culturais favoritos">
      {favorites.map((place, index) => (
        <li key={place.id}>
          <PlaceCard
            place={place}
            headingLevel={2}
            tone={index % 2 === 0 ? 'green' : 'mustard'}
          />
        </li>
      ))}
    </ul>
  );
}

export default function Salvos() {
  const { favorites, status, error, isAuthenticated, authStatus, retry } = useFavorites();

  if (authStatus === AuthStatus.LOADING) {
    return (
      <p className={styles.loading} role="status">
        Carregando sua conta…
      </p>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meus Favoritos</h1>
        <p className={styles.subtitle}>
          Seus espaços culturais salvos para consultar e planejar próximos passeios.
        </p>
      </header>

      {!isAuthenticated ? (
        <AnonymousState />
      ) : status === RequestStatus.ERROR ? (
        <RequestError error={error} onRetry={retry} fallbackMessage={FALLBACK_ERROR} />
      ) : status !== RequestStatus.SUCCESS ? (
        <p className={styles.loading} role="status">
          Carregando seus favoritos…
        </p>
      ) : favorites.length === 0 ? (
        <EmptyFavoritesState />
      ) : (
        <FavoritesList favorites={favorites} />
      )}
    </div>
  );
}
