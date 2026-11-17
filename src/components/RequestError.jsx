// src/components/RequestError.jsx
// Mensagem de erro de uma consulta ao backend, com "Tentar de novo" quando repetir pode
// resolver (falha de rede, servidor ou serviço externo). Só o ApiError traz mensagem pronta
// para o usuário; outros erros são falhas internas e recebem `fallbackMessage`.
import { ApiError } from '../services/api';
import styles from './RequestError.module.css';

export default function RequestError({ error, onRetry, fallbackMessage, className = '' }) {
  const isApiError = error instanceof ApiError;
  const canRetry = Boolean(onRetry) && (!isApiError || error.isRetryable);
  return (
    <p className={`${styles.message} ${className}`}>
      {isApiError ? error.message : fallbackMessage}
      {canRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </p>
  );
}
