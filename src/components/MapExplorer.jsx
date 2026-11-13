// src/components/MapExplorer.jsx
// Mapa completo de espaços culturais: busca os pinos da área visível (usePlacesInBounds),
// desenha o mapa (Map) e mostra o estado da consulta (MapStatus). O tamanho vem de
// `className` (ex.: página Explorar).
import usePlacesInBounds from '../hooks/usePlacesInBounds';
import PlacesMap from './Map';
import MapStatus from './MapStatus';
import styles from './MapExplorer.module.css';

export default function MapExplorer({ className = '' }) {
  const { places, status, error, updateBounds, retry } = usePlacesInBounds();
  return (
    <div className={`${styles.explorer} ${className}`}>
      <PlacesMap
        className={styles.map}
        places={places}
        onBoundsChange={updateBounds}
      />
      <MapStatus count={places.length} status={status} error={error} onRetry={retry} />
    </div>
  );
}
