// src/components/PlaceResults.jsx
// Lista do painel da página Explorar (Figma: "4 lugares no mapa", com cards compactos):
// os mesmos espaços dos pinos, já filtrados (user story #6). Com um ponto de referência
// (issue #3), são os espaços do raio, do mais próximo ao mais distante, com a distância.
import { useId, useState } from 'react';
import { RequestStatus } from '../hooks/useApiRequest';
import { formatDistance, formatRadius } from '../services/geo';
import PlaceCard from './PlaceCard';
import RequestError from './RequestError';
import ShowAllToggle from './ShowAllToggle';
import styles from './PlaceResults.module.css';

export const INITIAL_COUNT = 6;
const FALLBACK_ERROR = 'Não foi possível carregar os espaços. Tente novamente.';

const count = (total) => (total === 1 ? '1 lugar' : `${total} lugares`);

// "a 1,2 km · gratuito" (com ponto) ou "gratuito" (área do mapa), depois do bairro.
function placeSummary(place, nearby) {
  return [
    nearby ? `a ${formatDistance(place.distanceKm)}` : null,
    place.badges?.is_free === true ? 'gratuito' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function headingText({ origin, results, radiusKm }) {
  if (results.status !== RequestStatus.SUCCESS) {
    return origin ? 'Lugares por perto' : 'Lugares no mapa';
  }
  const total = count(results.places.length);
  return origin
    ? `${total} em até ${formatRadius(radiusKm)} de ${origin.label}`
    : `${total} no mapa`;
}

function emptyMessage({ origin, radiusKm, filtered }) {
  if (origin) {
    return `Nenhum espaço cultural em até ${formatRadius(radiusKm)}. Aumente o raio${
      filtered ? ', remova algum filtro' : ''
    } ou escolha outro ponto.`;
  }
  return filtered
    ? 'Nenhum espaço com esses filtros nesta área. Remova algum filtro ou mova o mapa.'
    : 'Nenhum espaço cultural nesta área do mapa. Mova o mapa ou afaste o zoom.';
}

function PlaceList({ places, nearby }) {
  const listId = useId();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? places : places.slice(0, INITIAL_COUNT);
  return (
    <>
      <ul id={listId} className={styles.list}>
        {visible.map((place, index) => (
          <li key={place.id}>
            <PlaceCard
              compact
              headingLevel={3}
              tone={index % 2 === 0 ? 'green' : 'mustard'}
              place={{ ...place, summary: placeSummary(place, nearby) }}
            />
          </li>
        ))}
      </ul>
      <ShowAllToggle
        total={places.length}
        limit={INITIAL_COUNT}
        expanded={showAll}
        onToggle={() => setShowAll((current) => !current)}
        label="Ver todos"
        controls={listId}
      />
    </>
  );
}

function ListBody(props) {
  const { places, status, error, retry } = props.results;
  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={FALLBACK_ERROR} />;
  }
  if (status !== RequestStatus.SUCCESS && places.length === 0) {
    return <p className={styles.message}>Procurando espaços…</p>;
  }
  if (places.length === 0) return <p className={styles.message}>{emptyMessage(props)}</p>;
  return <PlaceList places={places} nearby={Boolean(props.origin)} />;
}

// origin: { label } do ponto de referência, ou null (espaços da área do mapa);
// results: { places, status, error, retry } (usePlacesInBounds ou useProximitySearch);
// filtered: há filtros ativos (muda a sugestão quando nada é encontrado);
// headingRef recebe o título, que leva o foco após escolher um ponto.
export default function PlaceResults({
  origin = null,
  results,
  radiusKm,
  filtered = false,
  headingRef,
}) {
  const titleId = useId();
  const settled = results.status === RequestStatus.SUCCESS;
  return (
    <section className={styles.section} aria-labelledby={titleId} aria-busy={!settled}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title} aria-live="polite">
        {headingText({ origin, results, radiusKm })}
      </h2>
      <ListBody origin={origin} results={results} radiusKm={radiusKm} filtered={filtered} />
    </section>
  );
}
