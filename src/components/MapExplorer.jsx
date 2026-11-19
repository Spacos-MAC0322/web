// src/components/MapExplorer.jsx
// Mapa completo de espaços culturais: busca os pinos da área visível (usePlacesInBounds),
// desenha o mapa (Map) e mostra o estado da consulta (MapStatus). O tamanho vem de
// `className` (ex.: página Explorar).
// Com `searchArea` (busca "Perto de você", issue #3), mostra só os espaços do raio, vindos
// de `nearby`, e para de consultar a área visível; sem ela, volta a consultar sozinho.
import usePlacesInBounds from '../hooks/usePlacesInBounds';
import { formatRadius } from '../services/geo';
import PlacesMap from './Map';
import MapStatus from './MapStatus';
import styles from './MapExplorer.module.css';

// searchArea: { center, radiusKm, label } ou null; nearby: { places, status, error, retry }
// de useProximitySearch; onLocate/locating: botão "Usar minha localização" do mapa.
export default function MapExplorer({
  className = '',
  searchArea = null,
  nearby = null,
  onLocate,
  locating = false,
}) {
  const inBounds = usePlacesInBounds();
  const nearbyMode = Boolean(searchArea && nearby);
  const current = nearbyMode ? nearby : inBounds;
  const emptyMessage = nearbyMode
    ? `Nenhum espaço em até ${formatRadius(searchArea.radiusKm)}. Aumente o raio.`
    : undefined;
  return (
    <div className={`${styles.explorer} ${className}`}>
      <PlacesMap
        className={styles.map}
        places={current.places}
        onBoundsChange={nearbyMode ? undefined : inBounds.updateBounds}
        searchArea={nearbyMode ? searchArea : null}
        onLocate={onLocate}
        locating={locating}
      />
      <MapStatus
        count={current.places.length}
        status={current.status}
        error={current.error}
        onRetry={current.retry}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
