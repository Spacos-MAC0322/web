// src/pages/Rotas.jsx
// Página "Meus roteiros" (/rotas, user story #11): lista os roteiros do usuário logado,
// com data e número de paradas, e leva ao editor (/rotas/novo e /rotas/:id).
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import RequestError from '../components/RequestError';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { AuthStatus, useAuth } from '../hooks/useAuth';
import { listItineraries } from '../services/itineraries';
import {
  formatItineraryDate,
  itineraryPath,
  NEW_ITINERARY_PATH,
  stopCountText,
} from './itineraryFormat';
import styles from './Rotas.module.css';

const FALLBACK_ERROR = 'Não foi possível carregar seus roteiros. Tente novamente.';

// Também usado pelo editor (pages/Roteiro.jsx) quando não há sessão.
export function RoutesLoginPrompt({ from = '/rotas' }) {
  return (
    <section className={styles.emptyCard} aria-labelledby="rotas-login-title">
      <h2 id="rotas-login-title" className={styles.emptyTitle}>
        Entre para criar seus roteiros
      </h2>
      <p className={styles.emptyText}>
        Com uma conta no Spaços, você monta roteiros com horários para cada parada e os
        encontra de novo em qualquer dispositivo.
      </p>
      <Link to="/login" state={{ from }} className={styles.actionLink}>
        Entrar na conta
      </Link>
    </section>
  );
}

function EmptyState() {
  return (
    <section className={styles.emptyCard} aria-labelledby="rotas-empty-title">
      <h2 id="rotas-empty-title" className={styles.emptyTitle}>
        Você ainda não criou nenhum roteiro
      </h2>
      <p className={styles.emptyText}>
        Escolha uma data, adicione espaços culturais e defina o horário de cada parada.
      </p>
      <Link to={NEW_ITINERARY_PATH} className={styles.actionLink}>
        Criar roteiro
      </Link>
    </section>
  );
}

function ItineraryList() {
  const load = useCallback((signal) => listItineraries({ signal }), []);
  const { data, status, error, retry } = useApiRequest(load);

  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={FALLBACK_ERROR} />;
  }
  if (status !== RequestStatus.SUCCESS) {
    return (
      <p className={styles.loading} role="status">
        Carregando seus roteiros…
      </p>
    );
  }
  if (data.length === 0) return <EmptyState />;

  return (
    <ul className={styles.list} aria-label="Seus roteiros">
      {data.map((itinerary) => (
        <li key={itinerary.id}>
          <Link to={itineraryPath(itinerary.id)} className={styles.card}>
            <h2 className={styles.cardTitle}>{itinerary.title}</h2>
            <p className={styles.cardMeta}>
              <span>{formatItineraryDate(itinerary.date)}</span>
              <span aria-hidden="true"> · </span>
              <span>{stopCountText(itinerary.stopCount)}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Rotas() {
  const { status, isAuthenticated } = useAuth();

  if (status === AuthStatus.LOADING) {
    return (
      <p className={styles.loading} role="status">
        Carregando sua conta…
      </p>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Meus roteiros</h1>
          <p className={styles.subtitle}>
            Organize suas visitas em sequência, com o horário de cada parada.
          </p>
        </div>
        {isAuthenticated && (
          <Link to={NEW_ITINERARY_PATH} className={styles.actionLink}>
            Novo roteiro
          </Link>
        )}
      </header>

      {isAuthenticated ? <ItineraryList /> : <RoutesLoginPrompt />}
    </div>
  );
}
