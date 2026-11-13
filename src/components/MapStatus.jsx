// src/components/MapStatus.jsx
// Estado da consulta de pinos exibido sobre o mapa: carregando, área vazia ou erro (com
// "Tentar de novo"). Com pinos na tela, só leitores de tela recebem a contagem.
// Fica sobreposto ao mapa de propósito: se mudasse a altura do mapa, cada troca de estado
// geraria novos limites e uma nova consulta, em ciclo.
import { ApiError } from '../services/api';
import { PlacesStatus } from '../hooks/usePlacesInBounds';
import styles from './MapStatus.module.css';

const FALLBACK_ERROR = 'Não foi possível carregar os espaços. Tente novamente.';

function countText(count) {
  return `${count} ${count === 1 ? 'espaço' : 'espaços'} nesta área`;
}

function ErrorMessage({ error, onRetry }) {
  // Só o ApiError traz mensagem pronta para o usuário; outros erros são falhas internas.
  const isApiError = error instanceof ApiError;
  const canRetry = !isApiError || error.isRetryable;
  return (
    <p className={`${styles.pill} ${styles.error}`}>
      {isApiError ? error.message : FALLBACK_ERROR}
      {canRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </p>
  );
}

function StatusContent({ count, status, error, onRetry }) {
  if (status === PlacesStatus.ERROR) return <ErrorMessage error={error} onRetry={onRetry} />;
  if (status === PlacesStatus.IDLE || (status === PlacesStatus.LOADING && count === 0)) {
    return <p className={styles.pill}>Carregando espaços…</p>;
  }
  if (status === PlacesStatus.LOADING) return <p className={styles.pill}>Atualizando…</p>;
  if (count === 0) {
    return (
      <p className={styles.pill}>Nenhum espaço nesta área. Mova o mapa ou diminua o zoom.</p>
    );
  }
  return <p className="visually-hidden">{countText(count)}</p>;
}

// count: pinos na tela; status/error/onRetry: vindos de usePlacesInBounds.
export default function MapStatus({ count, status, error, onRetry }) {
  return (
    <div className={styles.overlay} role="status">
      <StatusContent count={count} status={status} error={error} onRetry={onRetry} />
    </div>
  );
}
