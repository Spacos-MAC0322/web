// src/components/MapStatus.jsx
// Estado da consulta de pinos exibido sobre o mapa: carregando, área vazia ou erro (com
// "Tentar de novo"). Com pinos na tela, só leitores de tela recebem a contagem.
// Fica sobreposto ao mapa de propósito: se mudasse a altura do mapa, cada troca de estado
// geraria novos limites e uma nova consulta, em ciclo.
import { PlacesStatus } from '../hooks/usePlacesInBounds';
import RequestError from './RequestError';
import styles from './MapStatus.module.css';

const FALLBACK_ERROR = 'Não foi possível carregar os espaços. Tente novamente.';

function countText(count) {
  return `${count} ${count === 1 ? 'espaço' : 'espaços'} nesta área`;
}

function StatusContent({ count, status, error, onRetry }) {
  if (status === PlacesStatus.ERROR) {
    return (
      <RequestError
        className={`${styles.pill} ${styles.error}`}
        error={error}
        onRetry={onRetry}
        fallbackMessage={FALLBACK_ERROR}
      />
    );
  }
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
