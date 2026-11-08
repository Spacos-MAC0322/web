// src/components/Map.jsx
// Mapa interativo de São Paulo (DA08): React-Leaflet com tiles do OpenStreetMap e pinos
// agrupados (clustering) para manter o mapa legível e rápido com milhares de lugares.
// O componente só desenha: quem busca os dados é o hook usePlacesInBounds, que recebe
// os limites visíveis por `onBoundsChange` a cada movimento ou zoom.
import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import styles from './Map.module.css';

const SAO_PAULO_CENTER = [-23.5505, -46.6333];
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;
// Região metropolitana com folga: impede que o mapa se perca longe da cidade.
const MAX_BOUNDS = [
  [-24.2, -47.2],
  [-23.1, -46.1],
];

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Ícones em HTML/CSS: evitam as imagens padrão do Leaflet, que quebram com o bundler do Vite.
// O Leaflet posiciona o ícone via `transform` inline, então a gota girada fica num filho.
const pinIcon = L.divIcon({
  html: `<span class="${styles.pinShape}"></span>`,
  className: styles.pin,
  iconSize: [28, 28],
  iconAnchor: [14, 34], // ponta da gota girada: 14 + 14·√2 px abaixo do topo
  popupAnchor: [0, -32],
});

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: `${styles.cluster} ${styles[size]}`,
    iconSize: [40, 40],
  });
}

// Informa os limites visíveis ao montar, ao mover/dar zoom e quando o contêiner muda de
// tamanho (ex.: seção redimensionada), já que o Leaflet só observa a janela.
function BoundsWatcher({ onBoundsChange }) {
  const map = useMap();
  useMapEvents({
    moveend: () => onBoundsChange?.(map.getBounds()),
    resize: () => onBoundsChange?.(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange?.(map.getBounds());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, onBoundsChange]);

  return null;
}

function defaultPopup(place) {
  return (
    <>
      <strong>{place.name}</strong>
      {place.category && <div>{place.category}</div>}
    </>
  );
}

// places: [{ id, name, category, position: [lat, lng], badges }] (services/places.js).
// renderPopup(place): conteúdo do card ao clicar no pino (MapPopupCard, issue #26).
export default function PlacesMap({
  places = [],
  onBoundsChange,
  renderPopup = defaultPopup,
  center = SAO_PAULO_CENTER,
  zoom = DEFAULT_ZOOM,
  className = '',
}) {
  return (
    <div
      role="region"
      aria-label="Mapa de espaços culturais de São Paulo"
      className={`${styles.wrapper} ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        className={styles.map}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <BoundsWatcher onBoundsChange={onBoundsChange} />
        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterIcon}>
          {places.map((place) => (
            <Marker
              key={place.id}
              position={place.position}
              icon={pinIcon}
              title={place.name}
            >
              <Popup>{renderPopup(place)}</Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
