// src/components/MapLocateControl.jsx
// Botão "Usar minha localização" abaixo dos botões de zoom (Figma: terceiro botão de
// "MapButtons", com a mira). É um controle do Leaflet, então fica empilhado com o zoom no
// canto superior direito; o conteúdo é React, renderizado por portal dentro do controle.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import locateIcon from '../assets/icons/localizar.svg';
import styles from './Map.module.css';

const LABEL = 'Usar minha localização';

// O elemento do controle é criado uma vez; o efeito só o adiciona ao mapa e o retira.
function createControlElement() {
  const element = L.DomUtil.create('div', `leaflet-bar ${styles.locateControl}`);
  // Cliques no botão não devem arrastar nem dar zoom no mapa.
  L.DomEvent.disableClickPropagation(element);
  L.DomEvent.disableScrollPropagation(element);
  return element;
}

export default function MapLocateControl({ onLocate, busy = false }) {
  const map = useMap();
  const [container] = useState(createControlElement);

  useEffect(() => {
    const control = new L.Control({ position: 'topright' });
    control.onAdd = () => container;
    control.addTo(map);
    return () => control.remove();
  }, [map, container]);

  return createPortal(
    <button
      type="button"
      className={styles.locateButton}
      onClick={onLocate}
      disabled={busy}
      aria-busy={busy}
      aria-label={LABEL}
      title={LABEL}
    >
      <img src={locateIcon} alt="" width="18" height="18" />
    </button>,
    container,
  );
}
