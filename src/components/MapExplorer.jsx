// src/components/MapExplorer.jsx
// Mapa completo de espaços culturais: desenha os pinos da área visível (`inBounds`, de
// usePlacesInBounds, que a página guarda para mostrar a mesma lista ao lado) e o estado da
// consulta (MapStatus). O tamanho vem de `className` (ex.: página Explorar).
// Com `searchArea` (busca "Perto de você", issue #3), mostra só os espaços do raio, vindos
// de `nearby`, e deixa de informar a área visível; sem ela, volta a informá-la.
import { formatRadius } from '../services/geo';
import PlacesMap from './Map';
import MapStatus from './MapStatus';
import styles from './MapExplorer.module.css';

// inBounds: resultado de usePlacesInBounds (places, status, error, retry, updateBounds);
// searchArea: { center, radiusKm, label } ou null; nearby: { places, status, error, retry }
// de useProximitySearch; filtered: há filtros ativos; onLocate/locating: botão
// "Usar minha localização" do mapa.
export default function MapExplorer({
  inBounds,
  className = '',
  searchArea = null,
  nearby = null,
  filtered = false,
  onLocate,
  locating = false,
}) {
  const nearbyMode = Boolean(searchArea && nearby);
  const current = nearbyMode ? nearby : inBounds;
  let emptyMessage;
  if (nearbyMode) {
    emptyMessage = `Nenhum espaço em até ${formatRadius(searchArea.radiusKm)}. Aumente o raio.`;
  } else if (filtered) {
    emptyMessage = 'Nenhum espaço com esses filtros nesta área.';
  }
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
