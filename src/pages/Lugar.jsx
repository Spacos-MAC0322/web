// src/pages/Lugar.jsx
// Página de detalhes de um espaço cultural (/lugar/:id, issue #32), no layout do protótipo
// "Explorar - Detalhes": faixa com o nome, nome e bairro · categoria, etiquetas, descrição,
// card "Planeje sua visita" e a programação vigente (#33). Os dados vêm de
// GET /api/places/{id}, que já reúne o dado aberto e a curadoria (DA06).
import { useCallback, useId } from 'react';
import { Link, useParams } from 'react-router-dom';
import EventList from '../components/EventList';
import FavoriteButton from '../components/FavoriteButton';
import PlaceFacts from '../components/PlaceFacts';
import PlaceHero from '../components/PlaceHero';
import PlaceTag from '../components/PlaceTag';
import RequestError from '../components/RequestError';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { fetchPlaceDetail } from '../services/places';
import { placeTags, sourceLinks } from './placeFormat';
import styles from './Lugar.module.css';

const FALLBACK_ERROR = 'Não foi possível carregar este espaço. Tente novamente.';

function BackLink() {
  return (
    <Link to="/explorar" className={styles.backLink} aria-label="Voltar para Explorar">
      ← Explorar
    </Link>
  );
}

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

// Coluna da esquerda: o protótipo repete o nome (já anunciado no h1) acima do subtítulo.
function PlaceIntro({ place, titleId }) {
  const tags = placeTags(place);
  const neighborhood = place.address?.neighborhood ?? place.territory?.district;
  const subtitle = [neighborhood, place.primary_category].filter(Boolean).join(' · ');
  const description = place.description?.long ?? place.description?.short;
  return (
    <section className={styles.intro} aria-labelledby={`${titleId}-sobre`}>
      <h2 id={`${titleId}-sobre`} className="visually-hidden">
        Sobre o espaço
      </h2>
      <p className={styles.name} aria-hidden="true">
        {place.name}
      </p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {tags.length > 0 && (
        <ul className={styles.tags} aria-label="Etiquetas do espaço">
          {tags.map(({ variant, label }) => (
            <li key={label}>
              <PlaceTag variant={variant}>{label}</PlaceTag>
            </li>
          ))}
        </ul>
      )}
      {description ? (
        <p className={styles.description}>{description}</p>
      ) : (
        <p className={styles.missing}>Este espaço ainda não tem descrição.</p>
      )}
    </section>
  );
}

function PlaceDetail({ place }) {
  const titleId = useId();
  return (
    <article className={styles.page} aria-labelledby={titleId}>
      <PlaceHero name={place.name} titleId={titleId} />
      <div className={styles.toolbar}>
        <nav aria-label="Voltar">
          <BackLink />
        </nav>
        <FavoriteButton placeId={place.id} placeName={place.name} variant="pill" />
      </div>
      <div className={styles.columns}>
        <PlaceIntro place={place} titleId={titleId} />
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
