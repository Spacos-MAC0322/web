// src/components/MapSearchArea.jsx
// Área da busca "Perto de você" desenhada dentro do mapa (issue #3): o círculo do raio e
// o ponto de referência. Ao mudar o ponto ou o raio, o mapa enquadra o círculo inteiro.
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { Circle, Marker, useMap } from 'react-leaflet';
import styles from './Map.module.css';

const FIT_PADDING = [24, 24];

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

const originIcon = L.divIcon({
  html: `<span class="${styles.originDot}"></span>`,
  className: styles.origin,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// center: [lat, lng]; radiusKm: raio da consulta; label: nome do ponto de referência.
export default function MapSearchArea({ center, radiusKm, label }) {
  const map = useMap();
  const [lat, lng] = center;
  const radiusMeters = radiusKm * 1000;
  const position = useMemo(() => [lat, lng], [lat, lng]);

  useEffect(() => {
    const bounds = L.latLng(lat, lng).toBounds(radiusMeters * 2);
    map.fitBounds(bounds, { padding: FIT_PADDING, animate: !prefersReducedMotion() });
  }, [map, lat, lng, radiusMeters]);

  return (
    <>
      <Circle
        center={position}
        radius={radiusMeters}
        interactive={false}
        pathOptions={{ className: styles.searchCircle }}
      />
      <Marker
        position={position}
        icon={originIcon}
        title={`Ponto de referência: ${label}`}
        keyboard={false}
        interactive={false}
        zIndexOffset={1000}
      />
    </>
  );
}
