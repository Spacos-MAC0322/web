// src/components/ConflictBadge.jsx
// Aviso de conflito numa parada do roteiro (issue #88):
// - "closed" (vermelho/terracota): o backend indicou que o local estará fechado;
// - "schedule" (amarelo/mostarda): o horário não combina com o da parada anterior.
// A cor nunca é a única pista: o texto começa com o tipo do aviso.
import styles from './ConflictBadge.module.css';

const LABELS = {
  closed: 'Fechado',
  schedule: 'Horário',
};

export default function ConflictBadge({ tone, children }) {
  return (
    <p className={`${styles.badge} ${styles[tone]}`}>
      <span className={styles.icon} aria-hidden="true">
        {tone === 'closed' ? '⛔' : '⚠'}
      </span>
      <span>
        <strong className={styles.label}>{LABELS[tone]}:</strong> {children}
      </span>
    </p>
  );
}
