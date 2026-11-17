// src/components/DiscoverSection.jsx
// Seção "Fora do óbvio" da página Descobrir (issue #53, frame "Fora do Óbvio" do Figma):
// espaços comunitários, independentes e descentralizados de GET /api/search/discover.
// O backend já alterna as zonas da cidade, então os primeiros cards são os mais variados.
import { useId, useState } from 'react';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { fetchDiscoverPlaces } from '../services/places';
import PlaceCard from './PlaceCard';
import RequestError from './RequestError';
import ShowAllToggle from './ShowAllToggle';
import styles from './DiscoverSection.module.css';

export const DISCOVER_SECTION_ID = 'fora-do-obvio';
const INITIAL_COUNT = 4;
const FALLBACK_ERROR = 'Não foi possível carregar a seleção. Tente novamente.';

const loadDiscover = (signal) => fetchDiscoverPlaces({ signal });

function DiscoverCards({ places }) {
  const listId = useId();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? places : places.slice(0, INITIAL_COUNT);
  return (
    <>
      <ul id={listId} className={styles.grid}>
        {visible.map((place, index) => (
          <li key={place.id}>
            {/* Como no protótipo: verde na coluna da esquerda, mostarda na da direita. */}
            <PlaceCard place={place} tone={index % 2 === 0 ? 'green' : 'mustard'} />
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

function DiscoverContent() {
  const { data: places, status, error, retry } = useApiRequest(loadDiscover);
  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={FALLBACK_ERROR} />;
  }
  if (status !== RequestStatus.SUCCESS) {
    return (
      <p role="status" className={styles.message}>
        Carregando a seleção…
      </p>
    );
  }
  if (places.length === 0) {
    return <p className={styles.message}>Ainda não há espaços na seleção Fora do óbvio.</p>;
  }
  return <DiscoverCards places={places} />;
}

// headingRef: recebe o título, para o filtro rápido levar o foco até a seção.
export default function DiscoverSection({ headingRef }) {
  const titleId = useId();
  return (
    <section id={DISCOVER_SECTION_ID} className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
        Fora do óbvio
      </h2>
      <p className={styles.note}>
        Espaços que ajudam você a conhecer outras partes e histórias da cidade.
      </p>
      <DiscoverContent />
    </section>
  );
}
