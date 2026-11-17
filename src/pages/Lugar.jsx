// src/pages/Lugar.jsx
// Página de detalhes de um espaço cultural (/lugar/:id, issue #32): cabeçalho com
// ilustração, descrição, endereço, horários, entrada e programação vigente (#33). Os dados
// vêm de GET /api/places/{id}, que já reúne o dado aberto e a curadoria (DA06).
import { useCallback, useId } from 'react';
import { Link, useParams } from 'react-router-dom';
import EventList from '../components/EventList';
import PlaceFacts from '../components/PlaceFacts';
import RequestError from '../components/RequestError';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { fetchPlaceDetail } from '../services/places';
import { placeBadgeLabels, sourceLinks } from './placeFormat';
import styles from './Lugar.module.css';

const FALLBACK_ERROR = 'Não foi possível carregar este espaço. Tente novamente.';

function PlaceError({ error, onRetry }) {
  const notFound = error?.status === 404;
  return (
    <div className={styles.state}>
      <h1 className={styles.stateTitle}>
        {notFound ? 'Espaço não encontrado' : 'Não foi possível abrir este espaço'}
      </h1>
      {notFound ? (
        <p>O endereço pode estar incorreto ou o espaço não está mais disponível.</p>
      ) : (
        <RequestError error={error} onRetry={onRetry} fallbackMessage={FALLBACK_ERROR} />
      )}
      <Link to="/explorar" className={styles.backLink}>
        Voltar ao mapa
      </Link>
    </div>
  );
}

function PlaceHeader({ place, titleId }) {
  const badges = placeBadgeLabels(place.badges);
  const neighborhood = place.address?.neighborhood ?? place.territory?.district;
  return (
    <header className={styles.header}>
      {/* A fonte não traz fotos: a ilustração usa as cores do tema. */}
      <div className={styles.art} aria-hidden="true">
        <span className={styles.artSun} />
        <span className={styles.artHill} />
      </div>
      <div className={styles.heading}>
        {place.primary_category && <span className={styles.tag}>{place.primary_category}</span>}
        <h1 id={titleId} className={styles.title}>
          {place.name}
        </h1>
        {neighborhood && <p className={styles.neighborhood}>{neighborhood}</p>}
        {badges.length > 0 && (
          <ul className={styles.badges} aria-label="Selos do espaço">
            {badges.map((label) => (
              <li key={label} className={styles.badge}>
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

function Sources({ sources }) {
  const links = sourceLinks(sources);
  if (links.length === 0) return null;
  return (
    <p className={styles.sources}>
      Dados de{' '}
      {links.map(({ name, url }, index) => (
        <span key={name}>
          {index > 0 && ', '}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {name}
              <span className="visually-hidden"> (abre em nova aba)</span>
            </a>
          ) : (
            name
          )}
        </span>
      ))}
      .
    </p>
  );
}

function PlaceDetail({ place }) {
  const titleId = useId();
  const description = place.description?.long ?? place.description?.short;
  return (
    <article className={styles.page} aria-labelledby={titleId}>
      <PlaceHeader place={place} titleId={titleId} />
      <div className={styles.columns}>
        <section className={styles.about} aria-labelledby={`${titleId}-sobre`}>
          <h2 id={`${titleId}-sobre`}>Sobre o espaço</h2>
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : (
            <p className={styles.missing}>Este espaço ainda não tem descrição.</p>
          )}
        </section>
        <PlaceFacts place={place} />
      </div>
      <EventList events={place.events} />
      <Sources sources={place.sources} />
    </article>
  );
}

export default function Lugar() {
  const { id } = useParams();
  const load = useCallback((signal) => fetchPlaceDetail(id, { signal }), [id]);
  const { data: place, status, error, retry } = useApiRequest(load);

  if (status === RequestStatus.ERROR) return <PlaceError error={error} onRetry={retry} />;
  if (status !== RequestStatus.SUCCESS) {
    return (
      <p className={styles.loading} role="status">
        Carregando espaço…
      </p>
    );
  }
  return <PlaceDetail place={place} />;
}
