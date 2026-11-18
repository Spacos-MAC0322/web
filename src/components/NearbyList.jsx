// src/components/NearbyList.jsx
// Lista "N lugares em até X km" do painel da página Explorar (issue #3; no Figma,
// "4 lugares no mapa" com cards compactos): espaços dentro do raio, do mais próximo ao
// mais distante, com bairro, distância e gratuidade.
import { useId, useState } from 'react';
import { RequestStatus } from '../hooks/useApiRequest';
import { formatDistance, formatRadius } from '../services/geo';
import PlaceCard from './PlaceCard';
import RequestError from './RequestError';
import ShowAllToggle from './ShowAllToggle';
import styles from './NearbyList.module.css';

export const INITIAL_COUNT = 6;
const FALLBACK_ERROR = 'Não foi possível carregar os espaços próximos. Tente novamente.';

// "Pinheiros · a 1,2 km · gratuito", no lugar do resumo do card.
function nearbySummary(place) {
  return [
    `a ${formatDistance(place.distanceKm)}`,
    place.badges?.is_free === true ? 'gratuito' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function headingText(count, radiusKm, label) {
  const places = count === 1 ? '1 lugar' : `${count} lugares`;
  return `${places} em até ${formatRadius(radiusKm)} de ${label}`;
}

function PlaceList({ places }) {
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
              place={{ ...place, summary: nearbySummary(place) }}
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

function ListBody({ nearby, radiusKm }) {
  const { places, status, error, retry } = nearby;
  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={FALLBACK_ERROR} />;
  }
  if (status === RequestStatus.LOADING && places.length === 0) {
    return <p className={styles.message}>Procurando espaços por perto…</p>;
  }
  if (places.length === 0) {
    return (
      <p className={styles.message}>
        Nenhum espaço cultural em até {formatRadius(radiusKm)}. Aumente o raio ou escolha
        outro ponto.
      </p>
    );
  }
  return <PlaceList places={places} />;
}

// origin: { label } do ponto de referência, ou null (a lista some); nearby: resultado de
// useProximitySearch; headingRef recebe o título, que leva o foco após escolher um ponto.
export default function NearbyList({ origin, nearby, radiusKm, headingRef }) {
  const titleId = useId();
  if (!origin) return null;
  const settled = nearby.status === RequestStatus.SUCCESS;
  return (
    <section className={styles.section} aria-labelledby={titleId} aria-busy={!settled}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title} aria-live="polite">
        {settled ? headingText(nearby.places.length, radiusKm, origin.label) : 'Lugares por perto'}
      </h2>
      <ListBody nearby={nearby} radiusKm={radiusKm} />
    </section>
  );
}
