// src/pages/Explorar.jsx
// Mapa de espaços culturais com o painel "Filtrar lugares" (frame Explorar do Figma).
// Os filtros (texto, grupos de interesse, preço e região, user story #6) ficam no endereço
// da página e valem para os pinos e para a lista ao lado, que mostram os mesmos espaços.
// Sem ponto de referência, são os espaços da área visível (usePlacesInBounds); com um
// endereço ou a localização do navegador, os do raio em volta dele (issue #3).
import { useCallback, useEffect, useRef, useState } from 'react';
import FilterPanel from '../components/FilterPanel';
import LocationSearchControl from '../components/LocationSearchControl';
import MapExplorer from '../components/MapExplorer';
import PlaceResults from '../components/PlaceResults';
import PlaceTextSearch from '../components/PlaceTextSearch';
import { RequestStatus } from '../hooks/useApiRequest';
import usePlacesInBounds from '../hooks/usePlacesInBounds';
import useProximitySearch from '../hooks/useProximitySearch';
import useSearchFilters from '../hooks/useSearchFilters';
import { activeFilterCount } from '../services/searchFilters';
import styles from './Explorar.module.css';

// Depois de escolher um ponto, o foco vai para o título da lista: quem usa teclado ou
// leitor de tela ouve quantos lugares há por perto sem procurar a lista.
function useFocusOnNewOrigin(origin) {
  const headingRef = useRef(null);
  useEffect(() => {
    if (origin) headingRef.current?.focus({ preventScroll: true });
  }, [origin]);
  return headingRef;
}

export default function Explorar() {
  const { filters, setFilters, clearFilters } = useSearchFilters();
  const filtered = activeFilterCount(filters) > 0;
  const proximity = useProximitySearch(filters);
  const inBounds = usePlacesInBounds(filters);
  const { origin, searchedRadiusKm, nearby, geolocation } = proximity;
  // Trocar a chave recria a busca por endereço: "Limpar" também apaga o que foi digitado.
  const [controlKey, setControlKey] = useState(0);
  const headingRef = useFocusOnNewOrigin(origin);
  const locating = geolocation.status === RequestStatus.LOADING;
  const searchArea = origin
    ? { center: origin.position, radiusKm: searchedRadiusKm, label: origin.label }
    : null;
  const setText = useCallback((q) => setFilters((current) => ({ ...current, q })), [setFilters]);

  const clear = () => {
    proximity.clear();
    clearFilters();
    setControlKey((current) => current + 1);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Encontre o seu próximo passeio</h1>
      <div className={styles.layout}>
        <div className={`${styles.panel} ${styles.controls}`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Filtrar lugares</h2>
            <button
              type="button"
              className={styles.clear}
              onClick={clear}
              disabled={!origin && !filtered}
            >
              Limpar
            </button>
          </div>
          <PlaceTextSearch value={filters.q} onChange={setText} />
          <LocationSearchControl
            key={controlKey}
            origin={origin}
            radiusKm={proximity.radiusKm}
            onRadiusChange={proximity.setRadiusKm}
            onSelect={proximity.setOrigin}
            onLocate={proximity.locate}
            locating={locating}
            locateError={geolocation.error}
          />
          {!origin && (
            <p className={styles.hint}>
              Busque um endereço ou use sua localização para ver os espaços culturais por perto.
            </p>
          )}
          <FilterPanel filters={filters} onChange={setFilters} />
        </div>
        <MapExplorer
          className={styles.map}
          inBounds={inBounds}
          searchArea={searchArea}
          nearby={nearby}
          filtered={filtered}
          onLocate={proximity.locate}
          locating={locating}
        />
        <div className={`${styles.panel} ${styles.results}`}>
          <PlaceResults
            origin={origin}
            results={origin ? nearby : inBounds}
            radiusKm={searchedRadiusKm}
            filtered={filtered}
            headingRef={headingRef}
          />
        </div>
      </div>
    </div>
  );
}
