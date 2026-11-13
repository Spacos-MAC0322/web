// src/components/MapPopupCard.jsx
// Card flutuante exibido ao clicar num pino do mapa (issue #26): nome do espaço, tag da
// categoria principal e o botão "Ver detalhes", que leva à página do lugar (issue #2).
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './MapPopupCard.module.css';

// Ids vêm do backend no formato "provedor:tipo:id" e precisam ser codificados na URL.
function placePath(id) {
  return `/lugar/${encodeURIComponent(id)}`;
}

// place: { id, name, category } (pino de services/places.js).
export default function MapPopupCard({ place }) {
  const titleId = useId();
  const detailsLink = useRef(null);

  // O React-Leaflet só monta o conteúdo com o popup aberto. Levar o foco para o card
  // permite que quem navega pelo teclado o alcance sem percorrer todos os pinos.
  useEffect(() => {
    detailsLink.current?.focus({ preventScroll: true });
  }, []);

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      {place.category && <span className={styles.tag}>{place.category}</span>}
      <h3 id={titleId} className={styles.title}>
        {place.name}
      </h3>
      <Link
        ref={detailsLink}
        to={placePath(place.id)}
        className={styles.detailsButton}
        aria-label={`Ver detalhes de ${place.name}`}
      >
        Ver detalhes
      </Link>
    </article>
  );
}
