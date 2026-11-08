// src/components/Map.jsx
// Mapa interativo de São Paulo (DA08): React-Leaflet com tiles do OpenStreetMap e pinos
// agrupados (clustering) para manter o mapa legível e rápido com milhares de lugares.
// O componente só desenha: quem busca os dados é o hook usePlacesInBounds, que recebe
// os limites visíveis por `onBoundsChange` a cada movimento ou zoom.
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import MapPopupCard from './MapPopupCard';
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
  return <MapPopupCard place={place} />;
}

// Se o popup fechar com o foco dentro dele (botão de fechar, Esc), o foco volta ao pino
// em vez de se perder no <body>. Fechamentos por clique em outro ponto já movem o foco.
function returnFocusToMarker(event) {
  const popupElement = event.popup.getElement();
  if (popupElement?.contains(document.activeElement)) {
    event.target.getElement()?.focus({ preventScroll: true });
  }
}

// O React-Leaflet mantém o conteúdo do popup montado depois da primeira abertura. Por isso
// só o popup aberto recebe conteúdo: o card é montado a cada abertura (e pega o foco) e
// não fica um card por pino já clicado. `placeId` chega ao Leaflet como opção do Marker.
function useOpenPlace() {
  const [openPlaceId, setOpenPlaceId] = useState(null);
  const markerEvents = useMemo(
    () => ({
      popupopen: (event) => {
        // O Leaflet rotula o botão de fechar em inglês ("Close popup").
        event.popup
          .getElement()
          ?.querySelector('.leaflet-popup-close-button')
          ?.setAttribute('aria-label', 'Fechar card');
        setOpenPlaceId(event.target.options.placeId);
      },
      popupclose: (event) => {
        returnFocusToMarker(event);
        const closedId = event.target.options.placeId;
        setOpenPlaceId((current) => (current === closedId ? null : current));
      },
    }),
    [],
  );
  return { openPlaceId, markerEvents };
}

// O Leaflet só trata Esc com o foco no próprio contêiner do mapa; com o foco dentro do
// card (que o recebe ao abrir), o Esc é tratado aqui.
function CloseOnEscape({ children }) {
  const map = useMap();
  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    map.closePopup();
  };
  return <div onKeyDown={onKeyDown}>{children}</div>;
}

// places: [{ id, name, category, position: [lat, lng], badges }] (services/places.js).
// renderPopup(place): conteúdo do card ao clicar no pino; padrão: MapPopupCard (#26).
export default function PlacesMap({
  places = [],
  onBoundsChange,
  renderPopup = defaultPopup,
  center = SAO_PAULO_CENTER,
  zoom = DEFAULT_ZOOM,
  className = '',
}) {
  const { openPlaceId, markerEvents } = useOpenPlace();
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
              placeId={place.id}
              eventHandlers={markerEvents}
            >
              <Popup className={styles.popup} minWidth={200} maxWidth={280}>
                {openPlaceId === place.id && (
                  <CloseOnEscape>{renderPopup(place)}</CloseOnEscape>
                )}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
