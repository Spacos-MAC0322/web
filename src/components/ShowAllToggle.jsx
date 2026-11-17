// src/components/ShowAllToggle.jsx
// Botão "Ver todos / Mostrar menos" de listas que começam resumidas (programação do lugar,
// seleção "Fora do óbvio"). Só aparece quando há itens escondidos.
import styles from './ShowAllToggle.module.css';

export default function ShowAllToggle({ total, limit, expanded, onToggle, label, controls }) {
  if (total <= limit) return null;
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      {expanded ? 'Mostrar menos' : `${label} (${total})`}
    </button>
  );
}
