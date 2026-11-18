// src/pages/Explorar.jsx
// Mapa de espaços culturais com o painel "Filtrar lugares" (frame Explorar do Figma).
// Sem ponto de referência, os pinos acompanham a área visível (usePlacesInBounds). Com um
// endereço ou a localização do navegador, o mapa mostra o raio e a lista ao lado traz os
// espaços dentro dele (issue #3). Os filtros por categoria e acessibilidade (#63) entram
// neste mesmo painel.
import { useEffect, useRef, useState } from 'react';
import LocationSearchControl from '../components/LocationSearchControl';
import MapExplorer from '../components/MapExplorer';
import NearbyList from '../components/NearbyList';
import { RequestStatus } from '../hooks/useApiRequest';
import useProximitySearch from '../hooks/useProximitySearch';
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
  const proximity = useProximitySearch();
  const { origin, searchedRadiusKm, nearby, geolocation } = proximity;
  // Trocar a chave recria o controle: "Limpar" também apaga o texto e as opções.
  const [controlKey, setControlKey] = useState(0);
  const headingRef = useFocusOnNewOrigin(origin);
  const locating = geolocation.status === RequestStatus.LOADING;
  const searchArea = origin
    ? { center: origin.position, radiusKm: searchedRadiusKm, label: origin.label }
    : null;

  const clear = () => {
    proximity.clear();
    setControlKey((current) => current + 1);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Encontre o seu próximo passeio</h1>
      <div className={styles.layout}>
        <div className={`${styles.panel} ${styles.controls}`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Filtrar lugares</h2>
            <button type="button" className={styles.clear} onClick={clear} disabled={!origin}>
              Limpar
            </button>
          </div>
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
        </div>
        <MapExplorer
          className={styles.map}
          searchArea={searchArea}
          nearby={nearby}
          onLocate={proximity.locate}
          locating={locating}
        />
        <div className={`${styles.panel} ${styles.results}`}>
          <NearbyList
            origin={origin}
            nearby={nearby}
            radiusKm={searchedRadiusKm}
            headingRef={headingRef}
          />
        </div>
      </div>
    </div>
  );
}
