// src/components/FavoriteButton.jsx
// Botão "Favoritar" com ícone de estrela para cards e página de detalhes de um espaço cultural.
// Quando o usuário não está logado, clicar redireciona para /login guardando a origem em state.from.
import { useLocation, useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import styles from './FavoriteButton.module.css';

function StarIcon({ filled }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.icon}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// variant: "icon" (apenas o ícone de estrela circular, usado nos cards) ou
// "pill" (ícone + rótulo "Favoritar" / "Favoritado", usado na página de detalhes).
export default function FavoriteButton({
  placeId,
  placeName,
  variant = 'icon',
  className = '',
}) {
  const { isAuthenticated, isFavorite, isPending, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const active = isAuthenticated && isFavorite(placeId);
  const pending = isPending(placeId);
  const targetName = placeName ? ` ${placeName}` : '';
  const ariaLabel = active
    ? `Remover${targetName} dos favoritos`
    : `Favoritar${targetName}`;

  async function handleClick(event) {
    event.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    try {
      await toggleFavorite(placeId);
    } catch {
      // Falha silenciosa no toggle ou mantida no estado anterior.
    }
  }

  const variantClass = variant === 'pill' ? styles.pill : styles.iconButton;
  const activeClass = active ? styles.active : '';

  return (
    <button
      type="button"
      className={`${styles.button} ${variantClass} ${activeClass} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={pending}
      onClick={handleClick}
    >
      <StarIcon filled={active} />
      {variant === 'pill' && (
        <span className={styles.label}>{active ? 'Favoritado' : 'Favoritar'}</span>
      )}
    </button>
  );
}
